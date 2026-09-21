// @ts-nocheck
// (و77) اختبار وحدة لـ streamGemini/callGemini مع كاش الداتابيز — fetch مُوك
// phase=1: استريم + كاش working_model بيتجرب الأول + 400-retry بدون thinking
// phase=2: عملية نضيفة بتقرا working_model ميت من الداتابيز → 404 → self-healing → كتابة الكاش
import { Database } from 'bun:sqlite'

var PHASE = process.env.PHASE || '1'
var DB_PATH = '/home/z/my-project/db/custom.db'
var sq = new Database(DB_PATH)
sq.query('CREATE TABLE IF NOT EXISTS AiModelCache (key TEXT PRIMARY KEY, value TEXT)').run()

process.env.GEMINI_API_KEY = 'fake-test-key-77'
process.env.DATABASE_URL = 'file:' + DB_PATH

var attempts: string[] = [] // الموديلات المُجرَّبة (من غير ListModels)

// @ts-ignore — موك fetch عالمي
globalThis.fetch = async function (url: any, opts: any) {
  var u = String(url)
  if (u.indexOf(':generateContent') < 0 && u.indexOf(':streamGenerateContent') < 0) {
    // ListModels (discovery) — نرجّع قائمة فاضية عشان ما تخربش الترتيب
    return new Response(JSON.stringify({ models: [] }), { status: 200 })
  }
  var m = u.match(/models\/([^:]+):/)
  var model = m ? m[1] : '?'
  var isStream = u.indexOf(':streamGenerateContent') >= 0
  var bodyStr = String((opts && opts.body) || '')
  if (model === 'dead-model-404') {
    attempts.push(model)
    return new Response(JSON.stringify({ error: { code: 404, message: 'model not found' } }), { status: 404 })
  }
  if (bodyStr.indexOf('thinkingConfig') >= 0) {
    attempts.push(model + '[400]')
    return new Response(JSON.stringify({ error: { code: 400, message: 'thinkingConfig unsupported' } }), { status: 400 })
  }
  attempts.push(model)
  if (isStream) {
    var sse =
      'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'قانون ' }] } }] }) + '\n\n' +
      'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'مساحة المثلث = ½ × القاعدة × الارتفاع' }] } }] }) + '\n\n'
    return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } })
  }
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'رد جيسون من الموديل ' + model }] } }] }), { status: 200 })
}

var mod = await import('../src/lib/gemini.ts')
var ok = true
function check(name: string, cond: boolean) { console.log((cond ? '✅ PASS' : '❌ FAIL') + ' — ' + name); if (!cond) ok = false }

if (PHASE === '1') {
  // الذاكرة النضيفة: working_model = cached-first-model-77 (مكتوب في الداتابيز تحت)
  sq.query("INSERT OR REPLACE INTO AiModelCache (key, value) VALUES ('working_model', 'cached-first-model-77')").run()
  sq.query("INSERT OR REPLACE INTO AiModelCache (key, value) VALUES ('models_json', ?)").run(JSON.stringify(['json-cache-model-77', 'cached-first-model-77']))
  var deltas: string[] = []
  var r1 = await mod.streamGemini({
    parts: [{ text: 'اختبار' }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
    timeoutMs: 10000,
    thinking: 'low',
    onDelta: function (d: string) { deltas.push(d) },
  })
  console.log('S1 attempts:', JSON.stringify(attempts))
  check('S1 streamGemini نجح', r1.ok === true)
  check('S1 أول محاولة = working_model من كاش الداتابيز (cached-first-model-77)', attempts[0] === 'cached-first-model-77')
  check('S1 دلتا progressive (قطعتين)', JSON.stringify(deltas) === JSON.stringify(['قانون ', 'مساحة المثلث = ½ × القاعدة × الارتفاع']))
  check('S1 النص المجمع = الدلتا', r1.text === 'قانون مساحة المثلث = ½ × القاعدة × الارتفاع')

  // S3 (فاز منفصل عشان القراءة النضيفة من الداتابيز): قيمة ميتة للفاز التاني
  sq.query("INSERT OR REPLACE INTO AiModelCache (key, value) VALUES ('working_model', 'dead-model-404')").run()
  sq.query("INSERT OR REPLACE INTO AiModelCache (key, value) VALUES ('models_json', ?)").run(JSON.stringify(['json-cache-model-77', 'cached-first-model-77']))
}

if (PHASE === '3') {
  // عملية نضيفة: working_model = gemini-3.6-flash (بيولّد thinkingConfig) —
  // الموك بيرد 400 لأي body فيه thinkingConfig → لازم يعيد من غيره وينجح
  sq.query("INSERT OR REPLACE INTO AiModelCache (key, value) VALUES ('working_model', 'gemini-3.6-flash')").run()
  var r3 = await mod.streamGemini({ parts: [{ text: 'اختبار' }], timeoutMs: 10000, thinking: 'low' })
  console.log('S3 attempts:', JSON.stringify(attempts))
  check('S3 نجح بعد retry بدون thinking', r3.ok === true && r3.text === 'قانون مساحة المثلث = ½ × القاعدة × الارتفاع')
  check('S3 الترتيب: gemini-3.6-flash[400] ثم gemini-3.6-flash', attempts.length === 2 && attempts[0] === 'gemini-3.6-flash[400]' && attempts[1] === 'gemini-3.6-flash')
}

if (PHASE === '2') {
  // عملية نضيفة: working_model المقروء من الداتابيز = dead-model-404 → 404 → الثابت نجح
  sq.query("INSERT OR REPLACE INTO AiModelCache (key, value) VALUES ('working_model', 'dead-model-404')").run()
  var r2 = await mod.callGemini({
    parts: [{ text: 'اختبار' }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
    timeoutMs: 10000,
  })
  console.log('S2 attempts:', JSON.stringify(attempts))
  check('S2 callGemini نجح بعد 404', r2.ok === true && r2.model === 'gemini-3.6-flash')
  check('S2 الترتيب: dead-model-404 أولًا (من كاش الداتابيز) ثم gemini-3.6-flash (الثابت الأول)',
    attempts[0] === 'dead-model-404' && attempts[1] === 'gemini-3.6-flash')
  // نجاح callGemini لازم يكتب working_model الجديد (fire-and-forget — نستنى شوية)
  await new Promise(function (r) { setTimeout(r, 800) })
  var row = sq.query("SELECT value FROM AiModelCache WHERE key = 'working_model'").get() as any
  check('S2 working_model في الداتابيز اتحدّث لـ gemini-3.6-flash', row && row.value === 'gemini-3.6-flash')
}

sq.close()
console.log(ok ? 'ALL PASS' : 'SOME FAILED')
process.exit(ok ? 0 : 1)
export {}
