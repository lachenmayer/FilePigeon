const {run} = require('@cycle/run')
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const xs = require('xstream').default

const makeIPCDriver = require('./helpers/makeIPCDriver')
const zipFile$ = require('./helpers/zipFile')

let win

function createWindow () {
  win = new BrowserWindow({width: 300, height: 300, background: '#ff9600'})

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'renderer', 'index.html'),
    protocol: 'file:',
    slashes: true,
  }))

  win.webContents.on('will-navigate', event => {
    event.preventDefault()
  })

  win.webContents.on('new-window', event => {
    event.preventDefault()
  })

  win.on('closed', () => {
    win = null
  })
}

app.on('ready', createWindow)
app.on('window-all-closed', () => { app.quit() })
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})


function main ({rendererActions, zip}) {

  //
  // NEXT:
  // - start serving (emitting actions)
  // - make served website
  // - log access & dl speed
  // - clean up temp dir
  //

  const serverActions$ = rendererActions
    .filter(a => a.type.startsWith('server/'))

  const files$ = serverActions$.fold((_, {type, payload}) => {
    switch (type) {
      case 'server/start': return Object.values(payload)
      case 'server/stop': return null
    }
    return _
  }, null)

  return {
    rendererActions: zip,
    zip: files$,
  }
}

const drivers = {
  rendererActions: makeIPCDriver(ipcMain),
  zip: zipDriver,
}

function zipDriver (files$) {
  return files$
    .filter(files => files != null)
    .map(zipFile$)
    .flatten()
}

run(main, drivers)
