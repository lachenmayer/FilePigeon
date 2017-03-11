const {run} = require('@cycle/run')
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default

const {makeIpcMainDriver} = require('./drivers/ipc')
const serverDriver = require('./drivers/server')
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
    // - make served website
    //

    const serverStopOnAppQuit$ = fromEvent(app, 'quit').mapTo(action('server/stop'))
    const serverStopByUser$ = ofType(sources.renderer, 'server/stop')
    const serverStopAction$ = xs.merge(serverStopOnAppQuit$, serverStopByUser$)

    const zipCreateAction$ = ofType(sources.renderer, 'server/files')
      .map(a => action('zip/create', Object.values(a.payload)))
    const zipRemoveAction$ = serverStopAction$
      .map(a => action('zip/remove', a.payload))
    const toZip$ = xs.merge(zipCreateAction$, zipRemoveAction$)

    const serverStartAction$ = ofType(sources.zip, 'zip/ready')
      .map(a => action('server/start', a.payload))

    const toServer$ = xs.merge(serverStartAction$, serverStopAction$)

    const toRenderer$ = xs.merge(sources.server, serverStartAction$, serverStopAction$).debug()

    const sinks = {
      renderer: toRenderer$,
      server: toServer$,
      zip: toZip$,
    }
    return sinks
  }

  const drivers = {
    renderer: makeIpcMainDriver(win),
    server: serverDriver,
    zip: zipDriver,
  }

  run(main, drivers)
})
