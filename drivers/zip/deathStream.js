const cleanup = require('node-cleanup')
const xs = require('xstream').default

module.exports = function () {
  return xs.create({
    clean: false,
    start: listener => {
      cleanup((exitCode, signal) => {
        if (!this.clean) {
          listener.next({exitCode, signal})
          listener.complete()
          this.clean = true
          return false
        }
      })
    },
    stop: () => {

    }
  })
}
