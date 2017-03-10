const {h, makeDOMDriver} = require('@cycle/dom')
const {run} = require('@cycle/run')
const {ipcRenderer} = require('electron')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default

const drag = require('../components/drag')
const files = require('../components/files')
const filesView = files.view

const action = require('../helpers/action')
const combine = require('../helpers/combine')
const makeIPCDriver = require('../helpers/makeIPCDriver')


const drivers = {
  DOM: makeDOMDriver('#app'),
  mainActions: makeIPCDriver(ipcRenderer),
}

function main ({DOM}) {
  const dragAction$ = drag.intent(DOM)
  const filesAction$ = files.intent(DOM)

  const dragModel$ = drag.model(dragAction$)
  const filesModel$ = files.model(filesAction$)

  const view$ = xs.combine(dragModel$, filesModel$).map(([drag, {files}]) => view(drag, files))

  return {
    DOM: view$,
    mainActions: filesAction$,
  }
}

run(main, drivers)

function view (drag, files) {
  return h(`div.main.${drag}`, [
    filesView(files),
    Object.keys(files).length > 0 ? h('button.serve', 'serve') : null,
  ])
}
