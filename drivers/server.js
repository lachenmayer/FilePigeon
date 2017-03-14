const encodeUrl = require('encodeurl')
const contentDisposition = require('content-disposition')
const destroy = require('destroy')
const fileSize = require('filesize')
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
    .map(({type, payload: {archive, files}}) => serveArchive(archive, files)
      .endWhen(ofType(action$, 'server/stop')))
    .flatten()
}

function serveArchive (archive, files) {
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
            return download(archive, a => listener.next(a), onError)
          }
          case '/':
          case '/index.html': {
            listener.next(action('server/request/view', {id}))
            const html = htmlHandler(req, res)
            return html(template(archive, files))
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
  return function (archive, onUpdate, onError) {
    onUpdate(action('server/request/start', {id}))

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Length', archive.size)
    res.setHeader('Content-Disposition', contentDisposition(userFacingName))

    if (req.method === 'HEAD') {
      return res.end()
    }

    const progressStream = makeProgressStream({
      length: archive.size,
      time: 100,
    })
    const fileStream = fs.createReadStream(archive.path, {encoding: null})

    fileStream.pipe(progressStream)
    progressStream.pipe(res)

    progressStream.on('progress', progress => {
      onUpdate(action('server/request/progress', {id, progress}))
    })

    onFinished(res, () => {
      destroy(fileStream)
      onUpdate(action('server/request/done', {id}))
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

function template (archive, files) {
  const content = h('div.container', [
    h('div.header', [
      h('h1', 'These files are for you! :)'),
    ]),
    h('div.wrapper', [
      h('div.files',
        files.map(file =>
          h('div.file', file.name)
        )
      ),
      h('div.download', [
        h('a.primary', {attrs: {href: '/drop'}}, 'download all files'),
        ' ',
        h('span.fileSize', fileSize(archive.size)),
      ]),
    ]),
    h('div.footer', [
      h('p', 'These files were shared with FilePigeon.'),
      h('p', 'FilePigeon lets you share files with people on the same network (eg. same WiFi) without having to upload the files to the "cloud".'),
    ]),
  ])
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>FilePigeon</title>
<link rel="stylesheet" href="/style.css" />
</head>
<body>
${toHtml(content)}
</body>
</html>`
}
