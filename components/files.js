const {h} = require('@cycle/dom')
const xs = require('xstream').default
const dropRepeats = require('xstream/extra/dropRepeats').default
const fromEvent = require('xstream/extra/fromEvent').default

const action = require('../helpers/action')

function intent (DOM) {
  const files$ = fromEvent(document.body, 'drop')
    .filter(e => e.dataTransfer.files.length > 0)
    .map(e => Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      type: f.type,
    })))

  const added = files$
    .map(files => action('files/add', files))
  const removed = DOM
    .select('.removeFile')
    .events('click')
    .map(e => {
      const path = e.target.dataset.path
      return action('files/remove', path)
    })
  const finalized = DOM
    .select('.serve')
    .events('click')
    .map(() => action('files/finalize'))

  return xs.merge(added, removed, finalized)
}

const initial = {
  files: {},
  final: false,
}

function model (action$) {
  return action$.fold(update, initial)
}

function update (model, {type, payload}) {
  const u = (base, diff) => Object.assign({}, base, diff)
  switch (type) {
    case 'files/add': {
      if (model.final) return model
      const filesByPath = {}
      payload.forEach(file => {
        filesByPath[file.path] = file
      })
      const newFiles = u(model.files, filesByPath)
      return u(model, {files: newFiles})
    }
    case 'files/remove': {
      if (model.final) return model
      const files = u(model.files)
      delete files[payload]
      return u(model, {files})
    }
    case 'files/finalize': {
      return u(model, {final: true})
    }
    case 'files/reset': {
      return initial
    }
  }
  return model
}

function view (files) {
  return h('div',
    Object.values(files).map(file =>
      h('div', [
        file.name,
        h('button.removeFile', {dataset: {path: file.path}}, 'x')
      ])
    )
  )
}

module.exports = {
  intent,
  model,
  view,
}
