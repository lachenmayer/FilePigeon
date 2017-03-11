const archiver = require('archiver')
const fs = require('fs')
const path = require('path')
const xs = require('xstream').default

const action = require('../helpers/action')
const ofType = require('../helpers/ofType')
const temporaryDirectory = require('../helpers/temporaryDirectory')

module.exports = function zipDriver (action$) {
  const action$$ = ofType(action$, 'zip/create')
    .map(a => zipFile$(a.payload)
      .endWhen(ofType(action$, 'zip/remove')))
  return {
    action$$,
  }
}

function zipFile$ (files) {
  if (files == null) {
    return xs.empty()
  }
  return xs.create({
    start: function (listener) {
      const tmp = temporaryDirectory()
      this.tmp = tmp.subscribe({
        next: tmpPath => {
          const zipPath = path.join(tmpPath, 'archive.zip')
          listener.next(action('zip/starting', zipPath))

          const zipStream = fs.createWriteStream(zipPath)
          zipStream.on('close', () => {
            listener.next(action('zip/ready', zipPath))
          })

          const archive = archiver('zip')
          archive.pipe(zipStream)

          files.forEach(file => {
            archive.file(file.path, {name: file.name, prefix: 'droppah'})
          })
          archive.finalize()
        }
      })
    },
    stop: function () {
      this.tmp.unsubscribe() // remove directory
    },
  })
}
