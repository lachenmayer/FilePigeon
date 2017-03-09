const {run} = require('@cycle/run')
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const xs = require('xstream').default

const makeIPCDriver = require('./makeIPCDriver')

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


function main ({IPC}) {
  IPC.addListener({next: console.log})
  return {
    IPC: xs.never()
  }
}

const drivers = {
  IPC: makeIPCDriver(ipcMain)
}

run(main, drivers)
