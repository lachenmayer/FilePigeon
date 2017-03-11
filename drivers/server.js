const encodeUrl = require('encodeurl')
const finalHandler = require('finalhandler')
const fs = require('fs')
const http = require('http')
const parseUrl = require('parseurl')
const serveStatic = require('serve-static')
const xs = require('xstream').default

const action = require('../helpers/action')
const ofType = require('../helpers/ofType')

const userFacingName = 'FilePigeon Drop.zip'

module.exports = function serverDriver (action$) {
  return ofType(action$, 'server/start')
    .map(a => serveFile(a.payload).endWhen(ofType(action$, 'server/stop')))
    .flatten()
}

function serveFile (filePath) {
  return xs.create({
    start: listener => {
      // const app = express()
      // app.get('/FilePigeon%20Drop.zip', (req, res) => {
      //   listener.next(action('server/request/start', req.ip))
      //   res.sendFile(filePath, err => {
      //     if (err) {
      //       listener.next(action('server/request/error', err))
      //     } else {
      //       listener.next(action('server/request/done'))
      //     }
      //   })
      // })
      const zipUrl = encodeUrl('/' + userFacingName)
      const server = http.createServer((req, res) => {
        const done = finalHandler(req, res)
        if (req.method === 'OPTIONS') {
          res.setHeader('Allow', 'HEAD, GET')
          return done()
        }
        if (['HEAD', 'GET'].indexOf(req.method) === -1) {
          res.setHeader('Allow', 'HEAD, GET')
          return done({status: 405})
        }

        const url = parseUrl(req)
        const path = url.pathname
        if (path === zipUrl) {
          fs.stat(filePath, (err, stats) => {
            if (err) {
              return done(err)
            }
            const {mtime, size} = stats
            res.setHeader('Content-Type', 'application/zip')
            res.setHeader('Content-Length', size)
            res.setHeader('Last-Modified', mtime.toUTCString())
            if (req.method === 'HEAD') {
              return
            }
            const fileStream = fs.createReadStream(filePath, {encoding: null})
            fileStream.pipe(res)
            fileStream.on('end', () => {
              fileStream.unpipe(res)
              res.end()
            })
          })
          return
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
