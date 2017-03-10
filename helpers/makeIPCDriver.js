const fromEvent = require('xstream/extra/fromEvent').default


// TODO make this work for ipcMain

module.exports = function (ipcInstance) {
  return actions$ => {
    actions$.addListener({
      next: files => {
        ipcInstance.send('action', files)
      }
    })
    return fromEvent(ipcInstance, 'action').map(([event, action]) => action)
  }
}
