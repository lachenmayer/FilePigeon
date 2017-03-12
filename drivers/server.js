const encodeUrl = require('encodeurl')
const cuid = require('cuid')
const finalHandler = require('finalhandler')
const fs = require('fs')
const http = require('http')
const parseUrl = require('parseurl')
const makeProgressStream = require('progress-stream')
const serveStatic = require('serve-static')
const xs = require('xstream').default

const action = require('../helpers/action')
const ofType = require('../helpers/ofType')

const userFacingName = 'FilePigeon Drop.zip'
const downloadUrl = '/drop'

module.exports = function serverDriver (action$) {
  return ofType(action$, 'server/start')
    .map(a => serveFile(a.payload).endWhen(ofType(action$, 'server/stop')))
    .flatten()
}

function serveFile (filePath) {
  return xs.create({
    start: listener => {
      const server = http.createServer((req, res) => {
        const onError = finalHandler(req, res)
        const download = downloadHandler(req, res)

        if (req.method === 'OPTIONS') {
          res.setHeader('Allow', 'HEAD, GET')
          return onError()
        }
        if (['HEAD', 'GET'].indexOf(req.method) === -1) {
          res.setHeader('Allow', 'HEAD, GET')
          return onError({status: 405})
        }

        const url = parseUrl(req)
        const path = url.pathname
        if (path === downloadUrl) {
          return download(filePath, listener.next, onError)
        }

        res.write('TODO')
        res.end()
        return
      })
      server.listen(() => {
        const port = server.address().port
        listener.next(action('server/ready', port))
      })
      this.server = server
    },
    stop: () => {
      this.server.close()
    }
  })
}

function downloadHandler (req, res) {
  return function (filePath, onUpdate, onError) {
    const id = cuid()
    onUpdate(action('server/request/start', {id}))
    fs.stat(filePath, (err, stats) => {
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
      const fileStream = fs.createReadStream(filePath, {encoding: null})

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
