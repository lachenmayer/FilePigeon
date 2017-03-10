const xs = require('xstream').default

module.exports = function combine (streamsObj) {
  const keys = Object.keys(streamsObj)
  const streams = Object.values(streamsObj)
  return xs.combine(...streams).map(values => {
    const obj = {}
    for (let i = 0; i < keys.length; i++) {
      obj[keys[i]] = values[i]
    }
    return obj
  })
}
