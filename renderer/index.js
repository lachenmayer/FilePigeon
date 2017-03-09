const {h, makeDOMDriver} = require('@cycle/dom')
const {run} = require('@cycle/run')
const {ipcRenderer} = require('electron')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default

const makeIPCDriver = require('../makeIPCDriver')


const drivers = {
  DOM: makeDOMDriver('#app'),
  IPC: makeIPCDriver(ipcRenderer),
}

function main ({DOM}) {
  const files$ = droppedFiles$()
  const dragActions = dragActions$(DOM)
  const fileActions = fileActions$(files$)
  const uiActions$ = xs.merge(dragActions, fileActions)
  const ipcActions$ = fileActions
  return {
    DOM: view$(model$(uiActions$)),
    IPC: ipcActions$,
  }
}

run(main, drivers)


function droppedFiles$ () {
  // We need to get the drop event from body because other drop events on other
  // targets do not contain files in the dataTransfer field.
  return fromEvent(document.body, 'drop')
    .filter(e => e.dataTransfer.files.length > 0)
    .map(e => Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      type: f.type,
    })))
}

function dragActions$ (DOM) {
  const container = DOM.select('#app')
  const dragging$ = container.events('dragover').map(e => {
    e.preventDefault()
    return action('dragging', e)
  })
  const dropped$ = container.events('drop').map(e => action('dropped', e))
  return xs.merge(dragging$, dropped$)
}

function fileActions$ (files$) {
  return files$.map(fs => action('files', fs))
}

function model$ (action$) {
  return action$.fold(update, {
    dragState: 'none',
    files: {},
  })
}

function update (model, {type, payload}) {
  const u = (base, diff) => Object.assign({}, base, diff)
  switch (type) {
    case 'dragging':
    case 'dropped':
      return u(model, {dragState: type})
    case 'files':
      const filesByPath = {}
      payload.forEach(file => {
        filesByPath[file.path] = file
      })
      const files = u(model.files, filesByPath)
      return u(model, {files})
  }
  console.warn('unhandled action', {type, payload})
  return model
}

function view$ (model$) {
  return model$.map(view)
}

function view ({dragState, files}) {
  console.log(files)
  return h('div', [
    h('div', dragState),
    h('div', Object.values(files).map(file => h('div', file.name))),
    files.length > 0 ? h('button', {id: 'serve'}, 'serve') : null,
  ])
}


function action (type, payload) {
  return {type, payload}
}

function log (x) {
  console.log(x)
  return x
}
