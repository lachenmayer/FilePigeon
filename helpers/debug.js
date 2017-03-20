function log (x) {
  console.error(x)
  return x
}

function trace (x) {
  console.trace(x)
  return x
}

module.exports = {
  log,
  trace,
}
