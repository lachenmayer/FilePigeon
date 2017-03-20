// This one line is the only reason for the entire rigmarole of starting a child process
// just to zip some files. Electron helpfully monkey-patches the `fs` module to
// read stuff from .asar files, which causes `fs.stat` to report them as directories.
// `archiver` dutifully writes those into the zip file, but .asar files do not
// save file permissions. So if we try to unarchive using the built-in macOS
// unarchiver, we just get a permissions error. If we try to unarchive with `unzip`,
// we get a big directory of junk files where `electron.asar` used to be.
// Setting process.noAsar 'temporarily' in the parent process did not work, probably
// because the `fs` module is already in the module cache somewhere or something.
// Moral of the story: don't fucking monkey-patch core modules.
process.noAsar = true

const archiver = require('archiver')
const fs = require('fs')
const path = require('path')
const pify = require('pify')
const xs = require('xstream').default

const action = require('../../helpers/action')
const ofType = require('../../helpers/ofType')
const {log} = require('../../helpers/debug')

const {readStream, writeListener} = require('./ipc')
const deathStream = require('./deathStream')
const tmpStream = require('./tmpStream')


const action$ = readStream(process)
const death$ = deathStream()

const zip$ = ofType(action$, 'zip/create')
  .map(a =>
    zipFile$(a.payload)
      .endWhen(ofType(action$, 'zip/remove'))
      .endWhen(death$)
  )
  .flatten()

zip$.addListener(writeListener(process))


function zipFile$ ({files, name}) {
  if (files == null) {
    return xs.empty()
  }
  return xs.create({
    start: function (listener) {
      const tmp$ = tmpStream()
      this.tmp$ = tmp$.subscribe({
        next: tmpPath => {
          const zipPath = path.join(tmpPath, 'archive.zip')
          listener.next(action('zip/starting', zipPath))

          const zipStream = fs.createWriteStream(zipPath)

          const archive = archiver('zip')
          archive.pipe(zipStream)

          try {
            addFiles(archive, {files, name})
          } catch (e) {
            return listener.error(e)
          }

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
      this.tmp$.unsubscribe() // remove directory
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
      throw {message: 'encountered weird file', file, stats}
    }
  }
  archive.finalize()
}
