// @ts-nocheck
// (و77) قياس سرعة أول دلتا من المساعد الذكي (SSE)
var BASE = process.env.BASE || 'http://localhost:3585'
var message = process.argv[2] || 'ايه هو قانون مساحة المثلث؟'

var t0 = Date.now()
var firstDeltaMs = -1
var deltas = 0
var text = ''
var done = false
var errMsg = ''

var res = await fetch(BASE + '/api/ai/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: message, stream: true, context: {} }),
})
var ttfb = Date.now() - t0
console.log('HTTP', res.status, '| content-type:', (res.headers.get('content-type') || '').split(';')[0], '| TTFB:', ttfb + 'ms')

if (!(res.headers.get('content-type') || '').includes('text/event-stream')) {
  console.log('NOT SSE:', (await res.text()).slice(0, 300))
  process.exit(0)
}

var reader = res.body!.getReader()
var decoder = new TextDecoder()
var buf = ''
while (true) {
  var chunk = await reader.read()
  if (chunk.done) break
  buf += decoder.decode(chunk.value, { stream: true })
  var lines = buf.split('\n')
  buf = lines.pop() || ''
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li].trim()
    if (!line || line.indexOf('data:') !== 0) continue
    var payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try {
      var ev = JSON.parse(payload)
      if (ev.delta) {
        if (firstDeltaMs < 0) firstDeltaMs = Date.now() - t0
        deltas++
        text += String(ev.delta)
      }
      if (ev.error) errMsg = String(ev.error)
      if (ev.done) done = true
    } catch (e) {}
  }
}
var total = Date.now() - t0
console.log('first delta:', firstDeltaMs < 0 ? 'NONE' : firstDeltaMs + 'ms', '| deltas:', deltas, '| done event:', done, '| error:', errMsg || 'none')
console.log('total:', total + 'ms', '| text length:', text.length)
console.log('TEXT[:400]:', text.slice(0, 400))
export {}
