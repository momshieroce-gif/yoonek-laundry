import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

let mainWindow
let verificationProcess

function verificationDirectory () {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'fingerprint-bridge')
    : path.resolve(__dirname, '..', 'fingerprint-bridge')
}

function startVerification () {
  if (verificationProcess && verificationProcess.exitCode === null) return true

  const directory = verificationDirectory()
  const batchFile = path.join(directory, 'run-verification.bat')
  verificationProcess = spawn('cmd.exe', ['/c', batchFile], {
    cwd: directory,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  verificationProcess.stdout.on('data', (data) => console.log('[fingerprint-verification]', data.toString().trim()))
  verificationProcess.stderr.on('data', (data) => console.error('[fingerprint-verification]', data.toString().trim()))
  verificationProcess.on('error', (error) => console.error('Could not start fingerprint verification:', error))
  verificationProcess.on('exit', (code) => {
    console.log(`Fingerprint verification stopped with code ${code}`)
    verificationProcess = null
  })
  return true
}

function stopVerification () {
  if (!verificationProcess || verificationProcess.exitCode !== null) return
  verificationProcess.kill()
  verificationProcess = null
}

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
    }
  })

  mainWindow.loadURL(process.env.APP_URL)

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)
app.whenReady().then(startVerification)

ipcMain.handle('fingerprint-verification-status', () => Boolean(
  verificationProcess && verificationProcess.exitCode === null
))
ipcMain.handle('fingerprint-verification-stop', () => {
  stopVerification()
  return true
})

app.on('before-quit', stopVerification)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
