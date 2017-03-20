const archiver = require('archiver')
const child_process = require('child_process')
const path = require('path')
const xs = require('xstream').default

const action = require('../../helpers/action')
const ofType = require('../../helpers/ofType')

const {readStream, writeListener} = require('./ipc')

module.exports = function zipDriver (action$) {
  const child = child_process.fork(path.join(__dirname, 'child.js'))
  action$.addListener(writeListener(child))
  return readStream(child)
}
