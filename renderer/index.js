const {h, makeDOMDriver} = require('@cycle/dom')
const {run} = require('@cycle/run')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default

const drag = require('../components/drag')
const files = require('../components/files')
const filesView = files.view
const server = require('../components/server')

const {ipcRendererDriver} = require('../drivers/ipc')

const action = require('../helpers/action')
const combine = require('../helpers/combine')
const ofType = require('../helpers/ofType')

const drivers = {
  dom: makeDOMDriver('#app'),
  server: ipcRendererDriver,
}

function main (sources) {
  const dragAction$ = drag.intent(sources.dom.select('.picker'))
  const dragState$ = drag.model(dragAction$)

  const filesAction$ = files.intent(sources.dom)
  const filesState$ = files.model(filesAction$)

  const serverAction$ = server.intent(sources.dom, filesState$)
  const serverState$ = server.model(sources.server)
  const toServer$ = serverAction$

  const view$ = combine({
    dragging: dragState$,
    files: filesState$,
    server: serverState$,
  }).map(view)
  const toDom$ = view$

  return {
    dom: toDom$,
    server: toServer$,
  }
}

run(main, drivers)

function view ({dragging, files, server: serverState}) {
  if (serverState.state === 'stopped') {
    return filePickerView(dragging, files)
  } else {
    return server.view(serverState)
  }
}

function filePickerView (dragging, files) {
  return h(`div.container.picker.${dragging}`, [
    filesView(files),
    Object.keys(files).length > 0 ? h('button.serve', 'serve') : null,
  ])
}
