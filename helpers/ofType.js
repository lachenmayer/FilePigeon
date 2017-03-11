module.exports = function ofType (stream, type) {
  return stream.filter(action => action.type === type)
}
