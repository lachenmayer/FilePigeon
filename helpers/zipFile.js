const archiver = require('archiver')
const fs = require('fs')
const xs = require('xstream').default

const action = require('./action')
const temporaryDirectory = require('./temporaryDirectory')

module.exports = function zipFile$ (files) {
  if (files == null) {
    return xs.empty()
  }
  return xs.create({
    start: function (listener) {
      const tmp = temporaryDirectory()
      this.tmp = tmp.subscribe({
        next: tmpPath => {
          listener.next(action('zip/start'))

          const zipPath = path.join(tmpPath, 'archive.zip')
          const zipStream = fs.createWriteStream(zipPath)
          zipStream.on('close', () => {
            listener.next(action('zip/done', zipPath))
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
