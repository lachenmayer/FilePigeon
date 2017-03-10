const action = require('../helpers/action')

function intent (DOM) {
  const container = DOM.select('#app')
  const dragged$ = container.events('dragover').map(e => {
    e.preventDefault()
    return action('drag/drag', e)
  })
  const dropped$ = container.events('drop').map(e => action('drag/drop', e))
  return xs.merge(dragged$, dropped$)
}

function model (dragAction$) {
  return dragAction$
    .fold((model, {type, payload}) => {
      switch (type) {
        case 'drag/drag': return 'dragging'
        case 'drag/drop': return 'none'
      }
      return model
    }, 'none')
}

module.exports = {
  intent,
  model,
}
