const {app, BrowserWindow} = require('electron')
const mapValues = require('lodash.mapvalues')
const xs = require('xstream').default
const dropRepeats = require('xstream/extra/dropRepeats').default
const fromEvent = require('xstream/extra/fromEvent').default
const {run} = require('@cycle/run')

function main ({lifecycle, mainWindow}) {
  mainWindow.focused$.addListener({next: l => console.log(l)})
  return {
    mainWindow: lifecycle.ready$.mapTo(true),
  }
}

const drivers = {
  lifecycle: makeAppLifecycleDriver(app),
  mainWindow: makeBrowserWindowDriver({width: 300, height: 300, backgroundColor: '#ff9600'}),
}

run(main, drivers)

// https://github.com/apoco/cycle-electron-driver/blob/master/src/AppLifecycleDriver.js
function makeAppLifecycleDriver (app) {
  return () => {
    const events = {
      willFinishLaunching$: 'will-finish-launching',
      ready$: 'ready',
      windowAllClosed$: 'window-all-closed',
      beforeQuit$: 'before-quit',
      willQuit$: 'will-quit',
    }
    return mapValues(events, event => fromEvent(app, event))
  }
}

function makeBrowserWindowDriver (initialOptions) {
  let win
  return exists$ => {
    exists$.addListener({
      next: exists => { win = exists ? new BrowserWindow(initialOptions) : null },
      error: e => { console.error(e) },
      end: () => { win = null },
    })
    // doesn't work
    const theWindow$ = exists$
      .mapTo(win)
      .filter(win => !!win)
    const event$ = eventName =>
      theWindow$
        .map(win => fromEvent(win, eventName))
        .flatten()
    const focused$ = xs.merge(event$('blur').mapTo(false), event$('focus').mapTo(false))
    return {
      focused$,
    }
  }
}
