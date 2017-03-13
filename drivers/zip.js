const archiver = require('archiver')
const fs = require('fs')
const path = require('path')
const pify = require('pify')
const xs = require('xstream').default

const action = require('../helpers/action')
const ofType = require('../helpers/ofType')
const temporaryDirectory = require('../helpers/temporaryDirectory')

const zipBaseName = 'FilePigeon Drop'

module.exports = function zipDriver (action$) {
  return ofType(action$, 'zip/create')
    .map(a => zipFile$(a.payload)
      .endWhen(ofType(action$, 'zip/remove')))
    .flatten()
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

          const archive = archiver('zip')
          archive.pipe(zipStream)

          addFiles(archive, files)

          zipStream.on('close', () => {
            listener.next(action('zip/ready', {
              path: zipPath,
              size: archive.pointer()
            }))
          })
        }
      })
    },
    stop: function () {
      this.tmp.unsubscribe() // remove directory
    },
  })
}

async function addFiles (archive, files) {
  for (let file of files) {
    const stats = await pify(fs.stat)(file.path)
    if (stats.isFile()) {
      archive.file(file.path, {name: file.name, prefix: zipBaseName})
    } else if (stats.isDirectory()) {
      const destinationPath = path.join(zipBaseName, file.name)
      // this API is weird. why different behaviour from `file`? https://archiverjs.com/docs/Archiver.html#directory
      archive.directory(file.path, destinationPath)
    } else {
      console.warn('encountered weird file', file, stats)
    }
  }
  archive.finalize()
}
