// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

var globalForPrisma = globalThis
var _prisma = globalForPrisma._prismaInstance

/* (2026-و40) withRetry بقت exported — حارس الترتيب التسلسلي (sequential-guard)
   بيغلف بيها قرايات SQL الخام عشان SQLITE_BUSY/انقطاع لحظي ما يبوّظش فحص التسليم */
export async function withRetry(fn, retries, delayMs) {
  if (retries === void 0) { retries = 3 }
  if (delayMs === void 0) { delayMs = 200 }
  for (var attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      var msg = error && (error.message || '')
      var code = error && (error.code || '')
      var isLocked = msg.indexOf('database is locked') !== -1 || code === 'SQLITE_BUSY'
      var isTransient = code === 'CONNRESET' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'NETWORK'
      if ((isLocked || isTransient) && attempt < retries) {
        await new Promise(function (r) { setTimeout(r, delayMs * (attempt + 1)) })
        continue
      }
      throw error
    }
  }
  throw new Error('withRetry: unexpected fallthrough')
}

/* ============================================================
 * (ر14) الإصلاح الجذري النهائي لبطء المنصة وتجمّدها المفاجئ (500 في
 * الفيديوهات والمدفوعات وكل حاجة) — تفكيك طبقات القفل كلها
 * ============================================================
 * التشخيص المُثبت بالقراءة الحية لكود الحزم المثبتة (node_modules):
 *
 * 1) @prisma/adapter-libsql (index-node.mjs) بيحط Mutex من async-mutex
 *    على **كل استعلام** — وperformIO بيصرف القفل في finally. لو الطلب
 *    اللي شايل القفل اتلغي (المتصفح قفل الصفحة/ريفريش أثناء البطء/مهلة
 *    انتهت والرد اتقفل والاستعلام لسه شغال) — سلسلة client.execute
 *    **عمرها ما بتتسوى** في workerd → finally عمره ما بينادي →
 *    **الـ Mutex بيفضل مقفول للأبد على الـ isolate** → كل استعلام بعد
 *    كده بيقف في الطابور للأبد → workerd يلغي الطلبات كلها
 *    («hung and would never generate a response» = 1101/500 عشوائي).
 *    ده بالظبط تسلسل أعراض المستر: بطء → رسالة «قاعدة البيانات بطيء»
 *    في الأدمن → وبعدها 500 في الفيديوهات والمدفوعات وكل حاجة.
 *
 * 2) قفل ر13 (turnstile) كان طبقة تانية فوق الـ Mutex بتاع المحوّل —
 *    يعني كل استعلام بيستنى طابورين ورا بعض = بطء مضاعف، ولو القفل
 *    الميت حصل برضه كان بيرجع بعد 30 ثانية لكن القفل التحتي للمحوّل
 *    بيفضل ميت → التجميد استمر رغم ر13.
 *
 * 3) والقفل نفسه **مش ضروري أصلًا** في الإنتاج: Turso بيتوصل عبر
 *    HTTP عديم الحالة (نسخة web من @libsql/client بتوجّه libsql://
 *    إلى https تلقائيًا — مؤكد من قراءة config.js) — كل استعلام =
 *    نداء fetch مستقل، والـ client نفسه فيه promiseLimit(20) داخلي
 *    للتزامن، وسيرفر Turso بيسلسل الكتابات بنفسه. التزامن الحقيقي
 *    آمن 100% والقفل كان بيأخر كل حاجة من غير أي فايدة.
 *
 * الحل (ر14):
 *  - إزالة طبقة turnstile بالكامل من db.ts.
 *  - استبدال الـ async-mutex بتاع المحوّل بmutex آمن مصغر:
 *    * على الداتابيز البعيدة (Turso): بدون أي قفل — acquire فوري.
 *      مفيش أي حالة مشتركة بين الاستعلامات → **استحالة الجمود** —
 *      أي طلب يتلغي يسيب وعوده يموت لوحده من غير ما يعلّق حد.
 *    * التسلسل اللي كان بيحميه القفل محفوظ فعليًا: سيرفر Turso
 *      يتعامل مع كل statement ذريًا، والسباقات على مستوى التطبيق
 *      كانت أصلاً ممكنة بين isolates متعددة فالقفل ما كانش بيضمن حاجة.
 *  - withRetry/safeWrite زي ما هم للحالات العابرة.
 * ============================================================ */

function makeNoopMutex() {
  var noopRelease = function () {}
  return {
    acquire: function () { return Promise.resolve(noopRelease) },
    isLocked: function () { return false },
  }
}

/* إيجاد الـ Mutex المخفي في الـ adapter (خانة بمفتاح Symbol خاص) وتبديله */
function patchAdapterMutex(adapter) {
  try {
    var syms = Object.getOwnPropertySymbols(adapter)
    for (var i = 0; i < syms.length; i++) {
      var v = adapter[syms[i]]
      if (v && typeof v.acquire === 'function' && typeof v.release === 'function' && typeof v.isLocked === 'function') {
        adapter[syms[i]] = makeNoopMutex()
        return true
      }
    }
  } catch (e) {}
  return false
}

/* الـ factory هو اللي بينشئ الـ adapter وقت connect — بنغلف connect
   عشان كل adapter جديد يطلع بالـ mutex الآمن */
function patchAdapterFactory(factory) {
  var origConnect = factory.connect.bind(factory)
  factory.connect = function () {
    return Promise.resolve(origConnect()).then(function (ad) {
      patchAdapterMutex(ad)
      return ad
    })
  }
  if (typeof factory.connectToShadowDb === 'function') {
    var origShadow = factory.connectToShadowDb.bind(factory)
    factory.connectToShadowDb = function () {
      return Promise.resolve(origShadow()).then(function (ad) {
        patchAdapterMutex(ad)
        return ad
      })
    }
  }
  return factory
}

function createPrismaClient() {
  var dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./db/custom.db'

  // Prisma's generated client still reads DATABASE_URL at runtime. Mirror
  // the Turso URL so existing and newly generated clients use the same source.
  if (!process.env.DATABASE_URL && dbUrl !== 'file:./db/custom.db') {
    process.env.DATABASE_URL = dbUrl
  }

  // Use the LibSQL adapter whenever Turso credentials are configured. This
  // also handles Turso URLs copied with the https:// protocol.
  if (process.env.TURSO_AUTH_TOKEN || dbUrl.indexOf('libsql://') === 0 || dbUrl.indexOf('https://') === 0) {
    var authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || ''
    var libsqlOpts = { url: dbUrl }
    if (authToken) { libsqlOpts.authToken = authToken }
    var adapter = new PrismaLibSQL(libsqlOpts)
    /* (ر14) القفل الآمن — التزامن الكامل على Turso بدون أي احتمال تجميد */
    patchAdapterFactory(adapter)
    return new PrismaClient({ adapter: adapter, log: [] })
  }

  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export var db = _prisma || createPrismaClient()
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma._prismaInstance = db
}

export async function safeWrite(fn) {
  return withRetry(fn, 3, 300)
}
