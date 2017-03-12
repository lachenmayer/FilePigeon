const {h} = require('@cycle/dom')
const xs = require('xstream').default
const sampleCombine = require('xstream/extra/sampleCombine').default

function intent (dom, filesState$) {
  const serverFilesAction$ = dom.select('.serve').events('click')
    .compose(sampleCombine(filesState$))
    .map(([_, files]) => action('server/files', files))
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
      console.log(requests)
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
      case 'server/request/done': return request({
        state: 'done',
      })
      case 'server/stop': return {
        state: 'stopped',
      }
    }
    return state
  }, initialState)
}

function view ({state, address, requests}) {
  return h(`div.container.server.${state}`, [
    state,
    address ? h('a', {attrs: {href: address}}, address) : null,
    requests ? h('div.requests', Object.values(requests).map(({state, progress}) => h('div', [
      state,
      progress ? progress.percentage : null,
    ]))) : null,
    h('button.serverStop', 'stop')
  ])
}

module.exports = {
  intent,
  model,
  view,
}
