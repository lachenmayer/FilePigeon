const {h} = require('@cycle/dom')
const xs = require('xstream').default
const sampleCombine = require('xstream/extra/sampleCombine').default

function intent (dom, archiveState$) {
  const serverFilesAction$ = dom.select('.serve').events('click')
    .compose(sampleCombine(archiveState$))
    .map(([_, archive]) => Object.assign({}, archive, {files: Object.values(archive.files)}))
    .map(archive => action('server/archive', archive))
  const serverStopAction$ = dom.select('button.serverStop').events('click')
    .mapTo(action('server/stop'))
  return xs.merge(serverFilesAction$, serverStopAction$)
}

function model (action$) {
  const initialState = {
    state: 'stopped',
  }
  return action$.fold((state, {type, payload}) => {
    const u = (base, ...updates) => Object.assign({}, base, ...updates)
    const request = requestState => {
      const {id} = payload
      const request = {}
      request[id] = requestState
      const requests = u(state.requests, request)
      return u(state, {requests})
    }
    switch (type) {
      case 'server/zipping': return {
        state: 'zipping',
      }
      case 'server/start': return {
        state: 'starting',
      }
      case 'server/ready': return {
        state: 'serving',
        address: payload,
        requests: {},
      }
      case 'server/request/view': return request({
        state: 'seen',
      })
      case 'server/request/start': return request({
        state: 'starting',
      })
      case 'server/request/progress': return request({
        state: 'progress',
        progress: payload.progress,
      })
      case 'server/request/done': {
        const {id} = payload
        const requests = u(state.requests)
        delete requests[id]
        return u(state, {requests})
      }
      case 'server/stop': return {
        state: 'stopped',
      }
    }
    return state
  }, initialState)
}

module.exports = {
  intent,
  model,
}
