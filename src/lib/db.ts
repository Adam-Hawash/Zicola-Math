// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

var globalForPrisma = globalThis
var _prisma = globalForPrisma._prismaInstance

/* (ر18) كاشف الأعطال العابرة الشامل — قطع الاتصال بـ Turso مش بيجي بشكل واحد:
   SQLITE_BUSY وCONNRESET وأحيانًا "fetch failed" أو UND_ERR_CONNECT_TIMEOUT
   أو socket hang up أو HttpError: 5xx من سيرفر Turso نفسه. الحارس القديم
   كان بيتصاد الأكواد بس — والرسايل دي كانت بتعدّي كفشل نهائي → 500 فورًا.
   دلوقتي الرسالة + السبب المتداخل (undici بيلف الخطأ في cause) بتتفحص كلهم */
var TRANSIENT_RE = new RegExp([
  'database is locked',
  'SQLITE_BUSY',
  'ECONNRESET', 'CONNRESET',
  'ETIMEDOUT', 'UND_ERR', 'UNDICI',
  'fetch failed', 'fetch error',
  'socket hang up', 'EPIPE', 'HPE_',
  'network', 'connection closed', 'connection reset', 'connection refused', 'connection terminated',
  'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND',
  'timed?\\s?out', 'timeout',
  'HttpError: 5\\d\\d', 'HTTP 5\\d\\d', '500 Internal Server Error',
  '502 Bad Gateway', '503 Service Unavailable', '504 Gateway',
  'temporarily unavailable', 'internal server error',
  'libsql.*\\b(500|502|503|504)\\b',
  'untagged enum', 'did not match any variant',
].join('|'), 'i')

function isTransientError(error: any): boolean {
  if (!error) return false
  var nodes = [error, error && error.cause, error && error.error, error && error.originalError]
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i]
    if (!n) continue
    var msg = typeof n === 'string' ? n : (n.message || '')
    var code = n.code || ''
    if (code === 'SQLITE_BUSY' || code === 'CONNRESET' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'EPIPE' || code === 'EAI_AGAIN' || code === 'NETWORK') return true
    if (msg && TRANSIENT_RE.test(msg)) return true
  }
  return false
}

/* (2026-و40) withRetry بقت exported — حارس الترتيب التسلسلي (sequential-guard)
   بيغلف بيها قرايات SQL الخام عشان SQLITE_BUSY/انقطاع لحظي ما يبوّظش فحص التسليم */
export async function withRetry(fn, retries, delayMs) {
  if (retries === void 0) { retries = 3 }
  if (delayMs === void 0) { delayMs = 200 }
  for (var attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (isTransientError(error) && attempt < retries) {
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

/* (ر18) غلاف الصمود الشامل — أي استعلام Prisma في أي قسم بيتلف تلقائيًا
   بإعادة المحاولة عند أي خطأ عابر (كل أشكال قطع Turso من كاشف ر18).
   ده مقصود على طبقة منفصلة عن إصلاح ر14 (القفل الميت): ر14 عالج التجميد،
   وده بيعالج الاخفاق اللحظي العابر اللي كان بيرجّع 500 فورًا من غير أي
   إعادة محاولة — نفس عائلة أعراض المستر: «ساعات تشتغل ساعات تجيب 500».
   طرق $ (transactions/raw) بتعدّي زي ما هي، ومفيش أي promise عابر
   بين الطلبات (كل retry جوه سلسلة الطلب نفسه — متوافق مع workerd) */
var _resilientDone = new WeakSet()
function resilientProxy(prisma) {
  if (!prisma || _resilientDone.has(prisma)) return prisma
  _resilientDone.add(prisma)
  var modelCache = {}
  var SKIP_PROPS = { then: 1, catch: 1, finally: 1, constructor: 1, toJSON: 1, inspect: 1 }
  return new Proxy(prisma, {
    get: function (target, prop) {
      if (typeof prop !== 'string') return Reflect.get(target, prop)
      /* (ر19) دوال $ (queryRawUnsafe/executeRawUnsafe/transaction) لازم تتربط
         بالهدف الخام — استدعاء db.$queryRawUnsafe(...) مع this=Proxy كان
         بيكسر مسار Prisma الداخلي ويرجّع «data did not match any variant
         of untagged enum JsonBody» ثابت على كل raw query (اتثبت حيًا على
         الإنتاج: /api/health بقيت unhealthy بعد نشر ر18 وكل الاستعلامات
         العادية شغالة) — الربط بيرجّع السلوك الأصلي بالضبط */
      if (prop.charCodeAt(0) === 36 /* $... */ || prop in SKIP_PROPS) {
        var v = Reflect.get(target, prop)
        return typeof v === 'function' ? v.bind(target) : v
      }
      if (prop in modelCache) return modelCache[prop]
      var orig = Reflect.get(target, prop)
      if (orig === null || orig === undefined) return orig
      if (typeof orig !== 'object' && typeof orig !== 'function') return orig
      var wrapped = new Proxy(orig, {
        get: function (mTarget, mProp) {
          if (typeof mProp !== 'string') return Reflect.get(mTarget, mProp)
          if (mProp.charCodeAt(0) === 36 || mProp in SKIP_PROPS) return Reflect.get(mTarget, mProp)
          var mOrig = Reflect.get(mTarget, mProp)
          if (typeof mOrig !== 'function') return mOrig
          var fn = mOrig
          var bound = function () {
            var args = Array.prototype.slice.call(arguments)
            return withRetry(function () { return fn.apply(mTarget, args) }, 2, 200)
          }
          try { Object.defineProperty(bound, 'name', { value: mProp, configurable: true }) } catch (eD) {}
          return bound
        },
      })
      modelCache[prop] = wrapped
      return wrapped
    },
  })
}

var _rawClient = _prisma || createPrismaClient()
export var db = resilientProxy(_rawClient)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma._prismaInstance = _rawClient
}

export async function safeWrite(fn) {
  return withRetry(fn, 3, 300)
}
