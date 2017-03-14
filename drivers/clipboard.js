const {clipboard} = require('electron')

module.exports = function (text$) {
  text$.addListener({
    next: text => {
      clipboard.writeText(text)
    }
  })
}
