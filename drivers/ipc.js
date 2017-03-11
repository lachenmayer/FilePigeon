const {ipcMain, ipcRenderer} = require('electron')
const fromEvent = require('xstream/extra/fromEvent').default

function ipcRendererDriver (action$) {
  action$.addListener({
    next: files => {
      ipcRenderer.send('action', files)
    }
  })
  return fromEvent(ipcRenderer, 'action').map(([event, action]) => action)
}

function makeIpcMainDriver (win) {
  return action$ => {
    action$.addListener({
      next: files => {
        win.webContents.send('action', files)
      }
    })
    return fromEvent(ipcMain, 'action').map(([event, action]) => action)
  }
}

module.exports = {
  ipcRendererDriver,
  makeIpcMainDriver,
}
