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
    : path.resolve(__dirname, '..', '..', '..', 'fingerprint-bridge')
}

function startVerification () {
  if (verificationProcess && verificationProcess.exitCode === null) return true

  const directory = verificationDirectory()
  const batchFile = path.join(directory, 'run-verification.bat')
  const commandInterpreter = process.env.ComSpec || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
  const launchedProcess = spawn(commandInterpreter, ['/c', batchFile], {
    cwd: directory,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  verificationProcess = launchedProcess
  launchedProcess.stdout.on('data', (data) => console.log('[fingerprint-verification]', data.toString().trim()))
  launchedProcess.stderr.on('data', (data) => console.error('[fingerprint-verification]', data.toString().trim()))
  launchedProcess.on('error', (error) => console.error('Could not start fingerprint verification:', error))
  launchedProcess.on('exit', (code) => {
    console.log(`Fingerprint verification stopped with code ${code}`)
    if (verificationProcess === launchedProcess) verificationProcess = null
  })
  return true
}

function stopVerification () {
  if (!verificationProcess || verificationProcess.exitCode !== null) return Promise.resolve()

  const processId = verificationProcess.pid
  verificationProcess = null
  if (platform !== 'win32') return Promise.resolve()

  return new Promise((resolve) => {
    const taskkillPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe')
    const taskkill = spawn(taskkillPath, ['/pid', String(processId), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore'
    })
    taskkill.on('error', (error) => {
      console.error('Could not stop fingerprint verification:', error)
      resolve()
    })
    taskkill.on('exit', resolve)
  })
}

async function restartVerification () {
  await stopVerification()
  return startVerification()
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

  // forward renderer console output to the main process stdout so it shows up in the terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[renderer] ${message} (${sourceId}:${line})`)
  })

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

ipcMain.handle('fingerprint-verification-start', () => startVerification())
ipcMain.handle('fingerprint-verification-restart', () => restartVerification())
ipcMain.handle('fingerprint-verification-status', () => Boolean(
  verificationProcess && verificationProcess.exitCode === null
))
ipcMain.handle('fingerprint-verification-stop', async () => {
  await stopVerification()
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
