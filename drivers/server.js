const encodeUrl = require('encodeurl')
const contentDisposition = require('content-disposition')
const cuid = require('cuid')
const finalHandler = require('finalhandler')
const fs = require('fs')
const http = require('http')
const internalIp = require('internal-ip')
const parseUrl = require('parseurl')
const path = require('path')
const makeProgressStream = require('progress-stream')
const serveStatic = require('serve-static')
const xs = require('xstream').default

const action = require('../helpers/action')
const ofType = require('../helpers/ofType')

const userFacingName = 'FilePigeon Drop.zip'

module.exports = function serverDriver (action$) {
  return ofType(action$, 'server/start')
    .map(({type, payload: {archivePath, files}}) => serveArchive(archivePath, files)
      .endWhen(ofType(action$, 'server/stop')))
    .flatten()
}

function serveArchive (archivePath, files) {
  return xs.create({
    start: listener => {
      const server = http.createServer((req, res) => {
        const onError = finalHandler(req, res)

        if (req.method === 'OPTIONS') {
          res.setHeader('Allow', 'HEAD, GET')
          return onError()
        }
        if (['HEAD', 'GET'].indexOf(req.method) === -1) {
          res.setHeader('Allow', 'HEAD, GET')
          return onError({status: 405})
        }

        const url = parseUrl(req)
        switch (url.pathname) {
          case '/drop': {
            const download = downloadHandler(req, res)
            return download(archivePath, a => listener.next(a), onError)
          }
          default: {
            const serve = serveStatic('downloader', {dotfiles: 'ignore'})
            return serve(req, res, onError)
          }
        }
      })
      server.listen(() => {
        const port = server.address().port
        const ip = internalIp.v4()
        const address = `http://${ip}:${port}/`
        listener.next(action('server/ready', address))
      })
      this.server = server
    },
    stop: () => {
      this.server.close()
    }
  })
}

function downloadHandler (req, res) {
  return function (archivePath, onUpdate, onError) {
    const id = cuid()
    onUpdate(action('server/request/start', {id}))
    fs.stat(archivePath, (err, stats) => {
      if (err) {
        return onError(err)
      }

      const {mtime, size} = stats

      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Length', size)
      res.setHeader('Content-Disposition', contentDisposition(userFacingName))
      res.setHeader('Last-Modified', mtime.toUTCString())

      if (req.method === 'HEAD') {
        return res.end()
      }

      const progressStream = makeProgressStream({
        length: size,
        time: 100,
      })
      const fileStream = fs.createReadStream(archivePath, {encoding: null})

      fileStream.pipe(progressStream)
      progressStream.pipe(res)

      progressStream.on('progress', progress => {
        onUpdate(action('server/request/progress', {id, progress}))
      })

      fileStream.on('end', () => {
        fileStream.unpipe(progressStream)
        progressStream.unpipe(res)
        res.end()
        onUpdate(action('server/request/done', {id}))
      })
    })
  }
}
