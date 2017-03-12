const {run} = require('@cycle/run')
const {app, BrowserWindow, ipcMain, shell} = require('electron')
const path = require('path')
const url = require('url')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default
const sampleCombine = require('xstream/extra/sampleCombine').default

const {makeIpcMainDriver} = require('./drivers/ipc')
const serverDriver = require('./drivers/server')
const zipDriver = require('./drivers/zip')

const action = require('./helpers/action')
const ofType = require('./helpers/ofType')

function createWindow () {
  let win = new BrowserWindow({width: 300, height: 300, background: '#ff9600', show: false})
  win.on('ready-to-show', () => { win.show() })
  win.on('closed', () => { win = null })

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

  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    // shell.openExternal(url)
  })

  app.on('window-all-closed', () => { app.quit() })

  return win
}

app.on('ready', () => {
  const win = createWindow()

  function main (sources) {

    //
    // NEXT:
    // - display file list in website
    // - fix directories in zips
    // - what to do with single zips? take forever to re-zip

    const serverStopOnAppQuit$ = fromEvent(app, 'quit').mapTo(action('server/stop'))
    const serverStopByUser$ = ofType(sources.renderer, 'server/stop')
    const serverStopAction$ = xs.merge(serverStopOnAppQuit$, serverStopByUser$)

    const files$ = ofType(sources.renderer, 'server/files')
      .map(action => Object.values(action.payload))

    const zipCreateAction$ = files$
      .map(files => action('zip/create', files))
    const zipRemoveAction$ = serverStopAction$
      .map(a => action('zip/remove', a.payload))
    const toZip$ = xs.merge(zipCreateAction$, zipRemoveAction$)

    const serverStartAction$ = ofType(sources.zip, 'zip/ready')
      .compose(sampleCombine(files$))
      .map(([zipReadyAction, files]) => action('server/start', {
        archivePath: zipReadyAction.payload,
        files,
      }))
    const toServer$ = xs.merge(serverStartAction$, serverStopAction$)

    const serverZippingAction$ = ofType(sources.zip, 'zip/starting')
      .mapTo(action('server/zipping'))
    const toRenderer$ = xs.merge(sources.server, serverZippingAction$, serverStartAction$, serverStopAction$).debug()

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
