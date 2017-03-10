const {run} = require('@cycle/run')
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const xs = require('xstream').default

const files = require('./components/files')

const makeIPCDriver = require('./helpers/makeIPCDriver')

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


function main ({rendererActions}) {

  //
  // NEXT:
  // - get list of files in main
  // - create temp dir & zip up the files (emitting actions)
  // - start serving (emitting actions)
  // - make served website
  // - log access & dl speed
  // - clean up temp dir
  //

  const files$ = files.model(rendererActions)
  files$
    .filter(({final}) => final)
    .take(1)
    .addListener({next: console.log})

  return {
    rendererActions: xs.never(),
  }
}

const drivers = {
  rendererActions: makeIPCDriver(ipcMain)
}

run(main, drivers)
