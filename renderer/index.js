const {h, makeDOMDriver} = require('@cycle/dom')
const {run} = require('@cycle/run')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default

const drag = require('../components/drag')
const files = require('../components/files')
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

var grow = {
  'font-size': 0,
  transition: 'font-size 200ms',
  delayed: {'font-size': '1em'},
  remove: {'font-size': 0},
}

function view ({dragging, files, server: serverState}) {
  if (serverState.state === 'stopped') {
    return filePickerView(dragging, files)
  } else {
    return server.view(serverState)
  }
}

function filePickerView (dragging, files) {
  const children = Object.keys(files).length > 0
    ? filesView(files)
    : introView()

  return h('div.container.picker',
    {style: {background: dragging === 'none' ? '#09f' : '#3bf', transition: 'background 200ms'}},
    children
  )
}

function introView () {
  return h('div.center', [
    h('div.intro', {style: grow}, [
      h('h1', [h('span.headerFile', 'File'), h('span.headerPigeon', 'Pigeon')]),
      h('p', 'drop files to start the flight')
    ])
  ])
}

function filesView (files) {
  const fileList = Object.values(files)
  const size = fileList.map(file => file.size).reduce((a, b) => a + b, 0)
  return h('div.files', [
    h('div.centerVertical', [
      h('div.list', {style: grow},
        fileList.map(file =>
          h('div.file', {style: grow}, [
            h('span.fileName', file.name),
            ' ',
            h('button.removeFile', {dataset: {path: file.path}}, 'x')
          ])
        )
      ),
    ]),
    h('div.buttons', {style: grow}, [
      h('button.serve', 'serve'),
      h('button.clearFiles', 'clear'),
    ])
  ])
}
