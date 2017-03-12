const cuid = require('cuid')
const mkdirp = require('mkdirp')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
const xs = require('xstream').default

module.exports = function temporaryDirectory () {
  return xs.createWithMemory({
    start: function (listener) {
      this.dir = path.join(os.tmpdir(), `droppah-${cuid()}`)
      mkdirp(this.dir, err => {
        if (err) {
          return listener.error(err)
        } else {
          return listener.next(this.dir)
        }
      })
    },
    stop: function () {
      rimraf(this.dir)
    },
    dir: null,
  })
}
