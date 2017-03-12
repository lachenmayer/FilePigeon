const encodeUrl = require('encodeurl')
const contentDisposition = require('content-disposition')
const destroy = require('destroy')
const finalHandler = require('finalhandler')
const fs = require('fs')
const http = require('http')
const internalIp = require('internal-ip')
const onFinished = require('on-finished')
const parseUrl = require('parseurl')
const path = require('path')
const makeProgressStream = require('progress-stream')
const serveStatic = require('serve-static')
const h = require('snabbdom/h').default
const toHtml = require('snabbdom-to-html')
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
        const id = req.connection.remoteAddress

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
            const download = downloadHandler(req, res, id)
            return download(archivePath, a => listener.next(a), onError)
          }
          case '/':
          case '/index.html': {
            listener.next(action('server/request/view', {id}))
            const html = htmlHandler(req, res)
            return html(template(files))
          }
          default: {
            const serve = serveStatic('downloader', {dotfiles: 'ignore', index: false})
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

function downloadHandler (req, res, id) {
  return function (archivePath, onUpdate, onError) {
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

      onFinished(res, () => {
        destroy(fileStream)
        onUpdate(action('server/request/done', {id}))
      })
    })
  }
}

function htmlHandler (req, res) {
  return function (html) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')
    res.setHeader('Content-Length', Buffer.byteLength(html))
    res.end(html)
  }
}

function template (files) {
   const fileList = h('div.files',
    files.map(file =>
      h('div.file', file.name)
    )
  )
   return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>FilePigeon</title>
<link rel="stylesheet" href="/style.css" />
</head>
<body>
<p>this is ur file pigeon :-)</p>
${toHtml(fileList)}
<p><a href="/drop">click here</a> to get ur droppings</p>
</body>
</html>`
}
