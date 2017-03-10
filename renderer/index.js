const {h, makeDOMDriver} = require('@cycle/dom')
const {run} = require('@cycle/run')
const {ipcRenderer} = require('electron')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default
const sampleCombine = require('xstream/extra/sampleCombine').default

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

function main ({DOM, mainActions}) {
  const dragAction$ = drag.intent(DOM.select('.main'))
  const filesAction$ = files.intent(DOM)

  const dragging$ = drag.model(dragAction$)
  const files$ = files.model(filesAction$.debug())

  const serverStart = DOM.select('.serve').events('click')
    .compose(sampleCombine(files$))
    .map(([_, files]) => action('server/start', files))

  const serverState$ = mainActions.fold((state, {type, payload}) => {
    switch (type) {
      case 'zip/start': return 'zipping...'
      case 'zip/done': return 'zip file ready!'
    }
    return state
  }, null)

  const view$ = xs.combine(dragging$, files$, serverState$).map(models => view(...models))

  return {
    DOM: view$,
    mainActions: serverStart,
  }
}

run(main, drivers)

function view (dragging, files, serverState) {
  return h(`div.main.${dragging}`, [
    filesView(files),
    serverState || 'choose some filez',
    Object.keys(files).length > 0 ? h('button.serve', 'serve') : null,
  ])
}
