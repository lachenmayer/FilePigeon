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

function view ({dragging, files, server}) {
  const serverStopped = server.state === 'stopped'
  const serverStarting = server.state === 'zipping' || server.state === 'starting'
  const hasFiles = Object.keys(files).length > 0
  const isDragging = dragging !== 'none'
  const background = serverStopped
    ? isDragging
      ? '#3bf'
      : '#09f'
    : serverStarting
      ? '#999'
      : '#0d7'
  return h(`div.container`, {class: {picker: serverStopped}, style: {background, transition: 'background 400ms'}},
    serverStopped
      ? hasFiles
        ? filesView(files)
        : introView()
      : serverStarting
        ? serverStartingView(server.state)
        : servingView(server)
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
  return h('div.files.picker', [
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
      h('button.primary.serve', 'start sharing'),
      h('button.clearFiles', 'clear'),
    ])
  ])
}

function serverStartingView (state) {
  return h('div.center', [
    'preparing your drop :)'
  ])
}

function servingView ({state, address, requests}) {
  return [
    h('div.center', [
      h('h1', 'Your drop is ready.'),
      h('p', 'Send the link to anyone on your local network:'),
      h('p', h('a.shareLink', {attrs: {href: address}}, address)),
      h('button.copyToClipboard', 'copy link')
    ]),
    h('div.buttons', {style: grow}, [
      h('button.primary.serverStop', 'stop sharing')
    ])
  ]
}
