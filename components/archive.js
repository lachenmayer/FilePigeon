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
    .map(files => action('archive/add', files))
  const remove$ = dom
    .select('.removeFile')
    .events('click')
    .map(e => {
      const path = e.target.dataset.path
      return action('archive/remove', path)
    })
  const clear$ = dom
    .select('.clearFiles')
    .events('click')
    .mapTo(action('archive/clear'))
  const name$ = dom
    .select('.archiveName')
    .events('input')
    .map(e => action('archive/name', event.target.value))
  return xs.merge(add$, remove$, clear$, name$)
}

function model (action$) {
  const initial = {
    files: {},
    name: '',
  }
  return action$.fold((model, {type, payload}) => {
    const u = (base, diff) => Object.assign({}, base, diff)
    switch (type) {
      case 'archive/add': {
        const files = u(model.files)
        payload.forEach(file => {
          files[file.path] = file
        })
        return u(model, {files})
      }
      case 'archive/remove': {
        const files = u(model.files)
        delete files[payload]
        return u(model, {files})
      }
      case 'archive/clear': {
        const files = {}
        return u(model, {files})
      }
      case 'archive/name': {
        const name = payload
        return u(model, {name})
      }
    }
    return model
  }, initial)
}

module.exports = {
  intent,
  model,
}
