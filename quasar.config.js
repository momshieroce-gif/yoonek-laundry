/* eslint-env node */

/*
 * This file runs in a Node context (it's not transpiled by Babel), so use only
 * the ES6 features that are safely supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { configure } = require('quasar/wrappers');

module.exports = configure(function (ctx) {
  return {
    eslint: {
      fix: false,
      warnings: false,
      errors: false
    },

    boot: [
      'pinia',
      'firebase'
    ],

    css: [
      'app.scss'
    ],

    extras: [
      'roboto-font',
      'material-icons',
      'material-icons-outlined',
      'fontawesome-v6'
    ],

    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node16'
      },

      vueRouterMode: 'history'
    },

    sourceFiles: {
      electronMain: 'src-electron/electron-main.js',
      electronPreload: 'src-electron/electron-preload.js'
    },

    devServer: {
      open: true
    },

    framework: {
      config: {},
      iconSet: 'material-icons',
      lang: 'en-US',
      plugins: [
        'Notify',
        'Dialog',
        'Loading',
        'LocalStorage'
      ]
    },

    animations: [],

    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: [
        'render'
      ]
    },

    pwa: {
      workboxMode: 'generateSW',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false
    },

    capacitor: {
      hideSplashscreen: true
    },

    electron: {
      inspectPort: 5858,
      bundler: 'packager',
      packager: {
        asar: true,
        overwrite: true,
        extraResources: [
          {
            from: 'fingerprint-bridge',
            to: 'fingerprint-bridge'
          }
        ],
        icon: 'assets/icon.png'
      },
      builder: {
        appId: 'yoonek-laundry.org',
        productName: 'Yoonek Laundry',
        win: {
          target: ['nsis', 'portable']
        }
      }
    },

    bex: {
      contentScripts: [
        'my-content-script'
      ]
    }
  }
});
