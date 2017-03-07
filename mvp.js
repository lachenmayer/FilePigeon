const archiver = require('archiver')
const cuid = require('cuid')
const EventEmitter = require('events')
const express = require('express')
const fs = require('fs')
const http = require('http')
const ip = require('internal-ip').v4()
const mkdirp = require('mkdirp')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
const onQuit = require('node-cleanup')

const events = new EventEmitter()

const tmpPath = path.join(os.tmpdir(), `droppah-${cuid()}`)
mkdirp.sync(tmpPath)
onQuit(() => {
  rimraf.sync(tmpPath)
})

const zipPath = path.join(tmpPath, 'archive.zip')
const zipStream = fs.createWriteStream(zipPath)
zipStream.on('close', () => { events.emit('zip-ready') })

const archive = archiver('zip', {
  store: true,
})
archive.pipe(zipStream)

events.on('zip-ready', () => {
  const app = express()
  app.get('/drop', (req, res) => {
    res.sendFile(zipPath)
  })
  const port = 3000
  http.createServer(app).listen(port, () => {
    console.log('ur drop is reddy')
    console.log(`http://${ip}:${port}/drop`)
  })
})

const droppedPath = process.cwd()
archive.directory(droppedPath, 'droppah')
archive.finalize()
