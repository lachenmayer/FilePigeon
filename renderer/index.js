const {h, makeDOMDriver} = require('@cycle/dom')
const {run} = require('@cycle/run')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default
const sampleCombine = require('xstream/extra/sampleCombine').default

const drag = require('../components/drag')
const files = require('../components/files')
const filesView = files.view

const {ipcRendererDriver} = require('../drivers/ipc')

const action = require('../helpers/action')
const combine = require('../helpers/combine')


const drivers = {
  dom: makeDOMDriver('#app'),
  server: ipcRendererDriver,
}

function main (sources) {
  const dragAction$ = drag.intent(sources.dom.select('.picker'))
  const filesAction$ = files.intent(sources.dom)
  const serverStopAction$ = sources.dom.select('button.serverStop').events('click')
    .mapTo(action('server/stop'))

  const draggingState$ = drag.model(dragAction$)
  const filesState$ = files.model(filesAction$)
  const serverState$ = sources.server.fold((state, {type, payload}) => {
    switch (type) {
      case 'server/start': return 'starting'
      case 'server/ready': return 'serving'
      case 'server/stop': return 'stopped'
    }
  }, 'stopped')

  const view$ = combine({
    dragging: draggingState$,
    files: filesState$,
    server: serverState$,
  }).map(view)
  const toDom$ = view$

  const serverFilesAction$ = sources.dom.select('.serve').events('click')
    .compose(sampleCombine(filesState$))
    .map(([_, files]) => action('server/files', files))
  const toServer$ = xs.merge(serverFilesAction$, serverStopAction$)

  return {
    dom: toDom$,
    server: toServer$,
  }
}

run(main, drivers)

function view ({dragging, files, server}) {
  if (server === 'stopped') {
    return filePickerView(dragging, files)
  } else {
    return servingView(server)
  }
}

function filePickerView (dragging, files) {
  return h(`div.container.picker.${dragging}`, [
    filesView(files),
    Object.keys(files).length > 0 ? h('button.serve', 'serve') : null,
  ])
}

function servingView (serverState) {
  return h('div.container.serving', [
    serverState,
    h('button.serverStop', 'stop')
  ])
}
