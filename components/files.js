const {h} = require('@cycle/dom')
const xs = require('xstream').default
const fromEvent = require('xstream/extra/fromEvent').default

const action = require('../helpers/action')
const {log} = require('../helpers/debug')

function intent (dom) {
  const files$ = fromEvent(document.body, 'drop')
    .filter(e => e.dataTransfer.files.length > 0)
    .map(e => Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      type: f.type,
    })))
  const add$ = files$
    .map(files => action('files/add', files))
  const remove$ = dom
    .select('.removeFile')
    .events('click')
    .map(e => {
      const path = e.target.dataset.path
      return action('files/remove', path)
    })
  const clear$ = dom
    .select('.clearFiles')
    .events('click')
    .mapTo(action('files/clear'))
  return xs.merge(add$, remove$, clear$)
}

function model (action$) {
  return action$.fold((files, {type, payload}) => {
    const u = (base, diff) => Object.assign({}, base, diff)
    switch (type) {
      case 'files/add':
        const filesByPath = {}
        payload.forEach(file => {
          filesByPath[file.path] = file
        })
        return u(files, filesByPath)
      case 'files/remove':
        const newFiles = u(files)
        delete newFiles[payload]
        return newFiles
      case 'files/clear':
        return {}
    }
    return files
  }, {})
}

function view (files) {
  const fileList = Object.values(files)
  return h('div.files', [
    h('div.list', fileList.map(file =>
      h('div.file', [
        h('span.fileName', file.name),
        h('button.removeFile', {dataset: {path: file.path}}, 'x')
      ])
    )),
    h('div.clear', [
      fileList.length ? h('button.clearFiles', 'clear') : null
    ])
  ])
}

module.exports = {
  intent,
  model,
  view,
}
