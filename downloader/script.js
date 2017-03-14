var beat = 3000 // ms

function heartbeat (onDead) {
  var request = new XMLHttpRequest()
  request.timeout = beat
  request.onload = function (e) {
    window.setTimeout(function () { heartbeat(onDead) }, beat)
  }
  request.ontimeout = request.onerror = function (e) {
    onDead()
  }
  request.open('GET', '/alive')
  request.send()
}

heartbeat(function () {
  document.body.classList.add('dead')

  var title = document.getElementById('title')
  title.innerText = 'Your friend has stopped sharing :('

  var error = document.getElementById('error')
  error.innerText = 'Please ask them to send you another link to these files.'

  var link = document.getElementById('link')
  link.removeAttribute('href')
})
