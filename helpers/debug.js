function log (x) {
  console.log(x)
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
