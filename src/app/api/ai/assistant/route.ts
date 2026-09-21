// @ts-nocheck
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callGemini, streamGemini, hasGeminiKey } from '@/lib/gemini'
import ZAI from 'z-ai-web-dev-sdk'
/* (2026-و33) منقّي الرموز المشترك — نفس المكتبة اللي بتنضّف ملاحظات المصحح */
import { sanitizeMathText, ENGLISH_TERMS_RULE } from '@/lib/math-sanitize'

export const runtime = 'nodejs'
export const maxDuration = 60

/* ------------------------------------------------------------
 * المساعد الذكي — محرك مزدوج عشان الردود متبقاش بسيطة/غريبة:
 *  1) ZAI (z-ai-web-dev-sdk) — أساسي للنصوص: مفيش مفاتيح، ردود قوية دايمًا.
 *  2) Gemini — أساسي للصور (vision مثبت) واحتياطي للنصوص.
 * كل محرك لو فشل بيجرب التاني تلقائيًا قبل ما نقول "المساعد مشغول".
 *
 * جديد: تاريخ المحادثة (history) — المساعد بقى فاكر الكلام اللي فات
 * فالطالب مش محتاج يعيد كل حاجة من الأول كل رسالة.
 *
 * (و77) سرعة الرد: طلبات النصوص بس بتبعت Gemini بالاستريمينغ الحقيقي
 * (streamGemini + onDelta) — أول كلمة بتوصل للطالب لحظة ما الموديل
 * يكتبها بدل ما نستنى الرد كله وبعدين نعيد تشغيله بحروف.
 *
 * (و77) الشكاوى: اتلغت الشكاوى التلقائية نهائيًا — الشكوى بتتسجل بس
 * لما الطالب يكتبها بنفسه من تاب/صفحة الشكاوى (نظام الشكاوى اليدوي
 * زي ما هو بدون أي تغيير). المساعد بقى بوجّه الطالب لتكتبها بنفسه.
 * ------------------------------------------------------------ */
var MAX_IMAGES = 4
var MAX_B64_LENGTH = 7000000 // ~5MB binary after base64
var DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/
var MAX_HISTORY = 10 // آخر 10 رسائل (5 أدوار) بتبني سياق المحادثة
/* (و45) حارس طول الرسالة — طلب الحزمة: مفيش رسالة أطول من 2000 حرف */
var MAX_MESSAGE = 2000

/* (2026-و33) منقّي رموز الرياضيات اتنقل للمكتبة المشتركة src/lib/math-sanitize.ts
   (sanitizeMathText مستورد فوق) — بيتنفذ على رد الموديل قبل العرض
   فالطالب ما يشوفش غير رموز المنصة النضيفة: كسور رأسية وأُس وجُذور */

function buildImageParts(images: string[]): any[] {
  var parts: any[] = []
  if (!Array.isArray(images)) return parts
  for (var i = 0; i < images.length && parts.length < MAX_IMAGES; i++) {
    var src = typeof images[i] === 'string' ? images[i] : ''
    var m = DATA_URL_RE.exec(src)
    if (!m) continue
    var data = m[2].replace(/\s/g, '')
    if (!data || data.length > MAX_B64_LENGTH) continue
    parts.push({ inlineData: { mimeType: m[1], data: data } })
  }
  return parts
}

/* تاريخ المحادثة اللي بيبعته الواجهة: [{role, content}] */
function buildHistory(rawHistory: any): any[] {
  var out: any[] = []
  if (!Array.isArray(rawHistory)) return out
  var clean = rawHistory.filter(function (h: any) {
    return h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim()
  })
  var start = Math.max(0, clean.length - MAX_HISTORY)
  for (var i = start; i < clean.length; i++) {
    out.push({ role: clean[i].role, content: String(clean[i].content).slice(0, 4000) })
  }
  return out
}

/* (و45) هل النداء ده لشخصية شيرين؟ */
function isSherinePersona(persona: string): boolean {
  return String(persona || '').trim() === 'sherine'
}

/* ===== البرومبت الأساسي — أقوى بكتير: شخصية ثابتة + ردود نضيفة =====
 * (و45) شخصية «شيرين» — مدرّبة الرياضيات الشخصية (persona: 'sherine'):
 * نفس القواعد الرياضية والرموز والمصطلحات بالظبط، بس الشخصية بقى بنت مصرية
 * ودودة بتشرح بالعامية البسيطة وتشجّع الطالب — بدل «المساعد الذكي» الجاف. */
function buildSystemPrompt(platformName: string, subjectLine: string, persona: string): string {
  var isSherine = String(persona || '').trim() === 'sherine'
  var assistantName = isSherine ? 'شيرين' : 'المساعد الذكي'
  var opener = isSherine
    ? 'أنتي "شيرين" — مدرّبة الرياضيات الشخصية والودودة في ' + platformName + '. ' + subjectLine
    : 'أنت "' + assistantName + '" الرسمي لـ' + platformName + '. ' + subjectLine
  return [
    opener,
    '',
    '## شخصيتك وقواعد الكتابة (أهم حاجة):',
    isSherine
      ? '- إنتي شيرين: بتتكلمي عامية مصرية دافية وقريبة من الطالب («يلا بينا»، «برافو عليك»، «بص يا بطل») — وممنوع نهائيًا حروف متلخبطة أو كلام مش مفهوم أو فصحى جافة.'
      : '- بتكتب عربي مصري سليم وواضح ومقروء — ممنوع نهائيًا تكلمات مش موجودة في العربي أو حروف متلخبطة أو كلام مش مفهوم.',
    isSherine
      ? '- لو مش متأكدة من حاجة، قولي ببساطة: «مش متأكدة، اسأل المستر في الحصة» — بدل ما تخترعي معلومة.'
      : '- لو مش عارف أو مش متأكد، قول ببساطة: "مش متأكد، اسأل المستر في الحصة" — بدل ما تخترع معلومة.',
    '- ردودك قصيرة ومنظمة: نقاط أو خطوات مرقمة لما الموضوع يستحق، وإيموجي بسيط (✅ 💡 📚) من غير مبالغة.',
    '- ممنوع تبدأ ردك بترحيب طويل كل مرة — ادخل في الجواب على طول.',
    '',
    '## قاعدة كتابة الرموز الرياضية (أهم قاعدة في الكلام كله — طلب المستر حرفيًا):',
    '- إنت بتكتب في منصة ليها عارض رياضيات خاص بيحوّل أوامر LaTeX لرموز حقيقية (كسور رأسية وأُس فوق الرقم وجذر بخط فوقه). عشان كده:',
    '- ممنوع منعًا باتًا علامات الدولار $ أو $$ حوالين أي رمز — دي بتظهر للطالب كحروف خام ووخة. اكتب الرمز لوحده على طول.',
    '- ممنوع منعًا باتًا أي ماركداون: لا **نص** ولا *نص* ولا # ولا شرطات ماركداون — النجوم بتظهر للطالب زي ما هي.',
    '- الكسر اكتبه: \\frac{فوق}{تحت} — مثال: \\frac{3}{4} هيظهر كسر رأسي حقيقي. ممنوع تكتب 3/4 ولا "$\\frac{3}{4}$".',
    '- الأُس اكتبه: 2^{3} أو x^{2} — هيظهر الرقم فوق الرقم حقيقي. الجذر اكتبه: \\sqrt{5} وجذر تكعيبي \\sqrt[3]{8}.',
    '- الضرب × والقسمة ÷ والزاوية ° وال pi دايمًا بالرموز مش بالكلمات.',
    '- قبل ما تبعت الرد راجع نفسك: لو لقيت $ أو ** أو \\ .. \\ في كلامك يبقى فيه غلط — شيلهم.',
    '',
    '## قاعدة المصطلحات الإنجليزي (طلب المستر — زي دروس المنصة بالظبط):',
    ...ENGLISH_TERMS_RULE.split('\n'),
    '',
    '## معلومات عنك وعن المنصة:',
    '- اسمك: ' + assistantName + (isSherine ? ' — صاحبة الطالب في الرياضيات، شغالة 24 ساعة.' : '. وأنت جزء من المنصة نفسها — شغال 24 ساعة.'),
    '- بتساعد الطلاب في: شرح أي جزئية رياضيات، مراجعة حل الواجبات من الصور، أسئلة الامتحانات، وتنظيم المذاكرة.',
    '- المنصة فيها: فيديوهات الشرح، واجبات، امتحانات، نقاط وتقييمات، ومناقشات.',
    '',
    '## قواعد الرياضيات:',
    '- لما تحل مسألة: اكتب الخطوات بالترتيب خطوة خطوة، وبعدين الإجابة النهائية واضحة.',
    '- اشرح بذكاء: قول للطالب عمل إيه، وليه الخطوة دي بتيجي كده، وليه الاختيار الصح هو الصح — مش بس "الإجابة C" من غير سبب.',
    '- راجع حسابك قبل ما تكتب النتيجة — الدقة أهم من السرعة.',
    '',
    '## قاعدة الواجبات والصور (مهم جدًا):',
    '- الصورة فيها حل الطالب بخط يده؟ لكل سؤال بالترتيب: اكتب "إجابتك:" ونصه زي ما هو بالظبط بدون تعديل ← ثم "الإجابة الصحيحة:" ← ثم صح أو غلط وليه في سطر واحد قصير.',
    '- الصورة فيها أسئلة بدون حل؟ ممنوع نهائيًا تحل أو تديله الإجابات جاهزة! قول له بالظبط: "جرب تحل الأول وابعتلي إجاباتك (نص أو صورة) وأنا هقارن إجابتك بالإجابة الصحيحة سؤال بسؤال 📝".',
    '- مش عارف يبدأ؟ تلميحة صغيرة واحدة 💡 بدون الإجابة النهائية واطلب منه يحاول تاني.',
    '- الصورة مش رياضيات؟ ساعده عادي وباختصار.',
    '',
    '## قاعدة الشكاوى والمشاكل التقنية (و77 — بدون تسجيل تلقائي):',
    '- لو الطالب حكى لك عن مشكلة تقنية في المنصة (فيديو مش بيفتح، واجب أو امتحان مش باين، حساب مقفول، مشكلة في الفلوس أو المشتريات أو أي عطل) — تعاطف معاه ووجّهه بلطف إنه يكتب الشكوى بنفسه من تاب «الشكاوى» في بوابته أو صفحة الشكاوى عشان توصل للمستر فورًا. ممنوع تقول له إن الشكوى اتسجلت منك.',
  ].join('\n')
}

/* ===== ZAI — محرك أساسي للنصوص ===== */
async function zaiChat(systemPrompt: string, history: any[], userContent: any, timeoutMs: number): Promise<{ ok: boolean; text: string; error?: string }> {
  var tid: any = null
  try {
    var zai = await ZAI.create()
    var msgs: any[] = [{ role: 'assistant', content: systemPrompt }]
    for (var i = 0; i < history.length; i++) msgs.push({ role: history[i].role, content: history[i].content })
    msgs.push({ role: 'user', content: userContent })
    tid = setTimeout(function () { throw new Error('timeout') }, timeoutMs)
    var completion = await zai.chat.completions.create({
      messages: msgs,
      thinking: { type: 'disabled' },
    })
    clearTimeout(tid)
    var text = (completion && completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) || ''
    text = String(text || '').trim()
    if (!text) return { ok: false, text: '', error: 'empty reply' }
    return { ok: true, text: text }
  } catch (e: any) {
    if (tid) try { clearTimeout(tid) } catch (e2) {}
    return { ok: false, text: '', error: String((e && e.message) || e) }
  }
}

export async function POST(request: Request) {
  try {
    var body = await request.json()
    var message = (body.message || '').trim()
    var context = body.context || {}
    var persona = String(body.persona || '') /* (و45) 'sherine' = شخصية شيرين */
    var useStream = body.stream !== false
    var imageParts = buildImageParts(body.images)
    var history = buildHistory(body.history)

    if (!message && imageParts.length === 0) {
      return NextResponse.json({ error: 'مفيش رسالة' }, { status: 400 })
    }

    /* (و45) حارس الطول — رسالة أطول من الحد مرفوضة برسالة عربية ودودة */
    if (message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: 'الرسالة طويلة أوي 😅 اكتبلي سؤالك في ' + MAX_MESSAGE + ' حرف أو أقل وهرد عليك فورًا.' }, { status: 400 })
    }

    // الصور اتبعتت لكن كلها غير صالحة → نقول للطالب بوضوح
    var sentImages = Array.isArray(body.images) ? body.images.length : 0
    if (sentImages > 0 && imageParts.length === 0) {
      return NextResponse.json({ reply: 'الصور اللي بعتها مش مقبولة 😅 جرب تبعت صورة PNG أو JPG عادية.' })
    }

    var systemPrompt = buildSystemPrompt(
      'منصة The Scholar in Math (مستر أحمد شعبان)',
      isSherinePersona(persona) ? 'مدرّبة رياضيات شاطرة بتشرح بالعامية وبتساعد الطلاب في الـ Math.' : 'مدرّب رياضيات شاطر بيساعد الطلاب في الـ Math.',
      persona
    )
    if (context.page) systemPrompt += '\nالصفحة اللي الطالب واقف فيها: ' + context.page
    if (context.studentId) {
      try {
        var student = await db.$queryRawUnsafe('SELECT name, grade, phone FROM Student WHERE id = ? LIMIT 1', context.studentId)
        if (student && student.length > 0) systemPrompt += '\nاسم الطالب: ' + (student[0].name || '') + ' — الصف: ' + (student[0].grade || '') + ' (خاطبه باسمه لو مناسب)'
      } catch (e) {}
    }

    if (!message && imageParts.length > 0) {
      message = 'شوف الصور دي وساعدني فيها.'
    }

    // ---------- نجرب المحركات بالترتيب ونرجّع أول واحد ينجح ----------
    var timeoutMs = imageParts.length > 0 ? 50000 : 35000

    /* (و77) حالة الاستريم الحقيقي لهذا الطلب — محرك streamGemini بيكتب
       الدلتا هنا لحظة وصولها، والـSSE بيوصّلها للطالب فورًا.
       (متغير محلي لكل طلب — مفيش تداخل بين الطلبات المتوازية) */
    var live: { send: ((o: any) => void) | null; acc: string } = { send: null, acc: '' }

    // **النصوص: ZAI الأول (مفيش مفاتيح ورده قوية) → Gemini احتياطي**
    // **الصور: Gemini الأول (vision مثبت) → ZAI احتياطي**
    var engines: Array<() => Promise<{ ok: boolean; text: string; error?: string }>> = []
    if (imageParts.length > 0) {
      var geminiParts = imageParts.concat([{ text: systemPrompt + '\n\nرسالة الطالب: ' + message }])
      engines.push(function () {
        return callGemini({ parts: geminiParts, generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }, timeoutMs: timeoutMs, thinking: 'low' })
      })
      engines.push(function () {
        var content: any[] = [{ type: 'text', text: message }]
        for (var i = 0; i < body.images.length && content.length <= MAX_IMAGES; i++) {
          if (DATA_URL_RE.test(String(body.images[i]))) content.push({ type: 'image_url', image_url: { url: body.images[i] } })
        }
        return zaiChat(systemPrompt, history, content, timeoutMs)
      })
    } else {
      // **طلب المستر (2026-و7): Gemini 3.6 هو الأساسي في النصوص كمان —
      // المفتاح موجود في Vercel → Environment Variables (GEMINI_API_KEYS)
      // ولو المفتاح مش متظبط أو الحصة خلصت، ZAI بيفضل شبكة أمان**
      // **(و77) استريمينغ حقيقي: onDelta بيوجّه كل قطعة للـSSE لحظة وصولها
      // (live.send لسه null لو النداء legacy JSON — المُجمّع acc بس اللي بيشتغل)**
      if (hasGeminiKey()) {
        engines.push(function () {
          return streamGemini({
            parts: [{ text: systemPrompt + '\n\nرسالة الطالب: ' + message }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
            timeoutMs: timeoutMs,
            thinking: 'low',
            onDelta: function (t: string) {
              live.acc += t
              if (live.send) live.send({ delta: t })
            },
          })
        })
      }
      engines.push(function () { return zaiChat(systemPrompt, history, message, timeoutMs) })
    }

    // ---------- SSE STREAMING ----------
    if (useStream) {
      var encoder = new TextEncoder()
      var stream = new ReadableStream({
        async start(controller) {
          var closed = false
          var send = function (obj: any) {
            if (closed) return
            try { controller.enqueue(encoder.encode('data: ' + JSON.stringify(obj) + '\n\n')) } catch (e) {}
          }
          /* (و77) وصل محرك الاستريم الحقيقي بقناة الإرسال قبل تشغيل المحركات */
          live.send = send
          var result: any = null
          var lastErr = ''
          for (var ei = 0; ei < engines.length; ei++) {
            try {
              var r = await engines[ei]()
              if (r && r.ok && r.text) { result = r; break }
              lastErr = (r && r.error) || 'failed'
              console.error('[AI Assistant] engine ' + ei + ' failed:', lastErr)
            } catch (e: any) {
              lastErr = String((e && e.message) || e)
              console.error('[AI Assistant] engine ' + ei + ' threw:', lastErr)
            }
          }
          /* (و77) هل الدلتا وصلت فعلًا للطالب لحظة بلحظة؟ (نصوص فقط + استريم حقيقي) */
          var streamedLive = imageParts.length === 0 && live.acc.length > 0
          if (result) {
            if (streamedLive) {
              /* (و77) الاستريم الحقيقي — الرد وصل كامل للطالب قطعة قطعة بالفعل،
                 فمفيش إعادة تشغيل typewriter ولا منقّي رجعي (البرومبت بيمنع
                 $/الماركداون أصلًا) — خلاص وقفل */
              send({ done: true })
            } else {
              result.text = sanitizeMathText(result.text)
              // بنبعت الرد كقطع صغيرة (typewriter) — نفس شكل الاستريمينج الحقيقي
              // (للاحتياطي ZAI أو أي محرك مخزّن — ولمسات الصور)
              var chars = Array.from(result.text)
              var idx = 0
              await new Promise<void>(function (resolve) {
                var step = function () {
                  if (closed) { resolve(); return }
                  if (idx >= chars.length) { send({ done: true }); resolve(); return }
                  var chunk = chars.slice(idx, idx + 5).join('')
                  idx += 5
                  send({ delta: chunk })
                  setTimeout(step, 8)
                }
                step()
              })
            }
          } else {
            var busyMsg = 'المساعد مشغول دلوقتي جداً، جرب تاني بعد شوية 🙏'
            if (lastErr.indexOf('429') >= 0) busyMsg = 'الحصة اليومية للمساعد الذكي خلصت، جرب بكرة أو بعدين بشوية 🙏'
            send({ error: busyMsg })
          }
          try { closed = true; controller.close() } catch (e) {}
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // ---------- legacy JSON path (stream === false) ----------
    for (var ei2 = 0; ei2 < engines.length; ei2++) {
      try {
        var r2 = await engines[ei2]()
        if (r2 && r2.ok && r2.text) {
          r2.text = sanitizeMathText(r2.text)
          return NextResponse.json({ reply: r2.text })
        }
      } catch (e) {}
    }
    return NextResponse.json({ reply: 'المساعد مشغول دلوقتي جداً، جرب تاني بعد شوية 🙏' })
  } catch (error) {
    return NextResponse.json({ reply: 'المساعد مشغول دلوقتي جداً، جرب تاني بعد شوية 🙏' })
  }
}
