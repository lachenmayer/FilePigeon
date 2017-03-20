const xs = require('xstream').default

function readStream (otherProcess) {
  return xs.create({
    start: listener => {
      otherProcess.on('message', message => {
        listener.next(message)
      })
    },
    stop: () => {},
  })
}

function writeListener (otherProcess) {
  return {
    next: value => {
      otherProcess.send(value)
    },
    complete: () => {},
    error: error => {
      console.error(error)
    },
  }
}

module.exports = {
  readStream,
  writeListener,
}
