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

function zipFile$ ({files, name}) {
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

          addFiles(archive, {files, name})

          zipStream.on('close', () => {
            listener.next(action('zip/ready', {
              path: zipPath,
              size: archive.pointer(),
              files,
              name,
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

async function addFiles (archive, {files, name: archiveName}) {
  for (let file of files) {
    const stats = await pify(fs.stat)(file.path)
    const zipData = {
      name: file.name,
      prefix: archiveName,
      stats,
    }
    if (stats.isFile()) {
      archive.file(file.path, zipData)
    } else if (stats.isDirectory()) {
      const destinationPath = path.join(archiveName, file.name)
      // this API is weird. why different behaviour from `file`? https://archiverjs.com/docs/Archiver.html#directory
      archive.directory(file.path, destinationPath, zipData)
    } else {
      console.warn('encountered weird file', file, stats)
    }
  }
  archive.finalize()
}
