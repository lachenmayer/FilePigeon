const {run} = require('@cycle/run')
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const xs = require('xstream').default

const {makeIpcMainDriver} = require('./drivers/ipc')
const zipDriver = require('./drivers/zip')

const action = require('./helpers/action')
const ofType = require('./helpers/ofType')

function createWindow () {
  let win = new BrowserWindow({width: 300, height: 300, background: '#ff9600'})

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

  app.on('window-all-closed', () => { app.quit() })
  app.on('activate', () => {
    if (win === null) {
      createWindow()
    }
  })

  return win
}

app.on('ready', () => {
  const win = createWindow()

  function main (sources) {

    //
    // NEXT:
    // - start serving (emitting actions)
    // - make served website
    // - log access & dl speed
    // - clean up temp dir
    //

    const serverStopAction$ = ofType(sources.renderer, 'server/stop')

    const zipCreateAction$ = ofType(sources.renderer, 'server/files')
      .map(a => action('zip/create', Object.values(a.payload)))
    const zipRemoveAction$ = serverStopAction$
      .map(a => action('zip/remove', a.payload))
    const toZip$ = xs.merge(zipCreateAction$, zipRemoveAction$)

    const fromZip$ = sources.zip.action$$.flatten()
    const serverStartingAction$ = ofType(fromZip$, 'zip/starting')
      .mapTo(action('server/starting'))
    const serverReadyAction$ = ofType(fromZip$, 'zip/ready')
      .mapTo(action('server/ready')) // TODO only emit when actually serving
    const toRenderer$ = xs.merge(serverStartingAction$, serverReadyAction$, serverStopAction$).debug()

    const sinks = {
      renderer: toRenderer$,
      zip: toZip$,
    }
    return sinks
  }

  const drivers = {
    renderer: makeIpcMainDriver(win),
    zip: zipDriver,
  }

  run(main, drivers)
})
