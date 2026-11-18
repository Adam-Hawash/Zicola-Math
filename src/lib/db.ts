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
      var isTransient = code === 'CONNRESET' || code === 'ECONNRESET' || code === 'ETIMEDOUT'
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
 * (ر13) قفل التسلسل العالمي لعمليات قاعدة البيانات — إصلاح جذري
 * ============================================================
 * العطل المُثبت حيًا بالتشخيص المرحلي (wrangler dev بنفس runtime
 * الإنتاج workerd): أي نداءين متزامنين بيوصلوا قاعدة البيانات في
 * نفس اللحظة على نفس الـ isolate — سلسلة أحدهم بتتقطع وworkerd
 * يلغي النداء فورًا برسوم «hung and would never generate a
 * response» = في الإنتاج «error code: 1101» بجسم مش JSON.
 * الأدلة:
 *  - تزامن على راوت دافي بالداتابيز: 7/8 اتلغوا فورًا (0.04s).
 *  - تزامن عابر لراوتات الداتابيز: كلهم اتلغوا.
 *  - تزامن على راوت بدون داتابيز: سليم 100%.
 *  - نداءات الداتابيز المسلسلة: سليمة 100% (9/9 في الرِج).
 * درس ر13 المصيري: ممنوع تنسيق الطلبات عبر **promises عابرة للحدود**
 * — workerd بيقول حرفيًا «This promise was created by a request that
 * has since ended, so it can never settle» — أي طابور promises بين
 * طلبات هو نفسه نوع العطل. عشان كده القفل هنا **مزامن بالكامل**:
 * علم Boolean مشترك + polling بمؤقتات الطلب نفسه (النداء المنتظر
 * فاعل وعنده أحداث فما بيتلغاش)، والصرف في finally أثناء حياة صاحب
 * النداء، وسرقة القفل بعد 30 ثانية لو صاحبه اتلغى (ضمان ضد حصار دائم).
 * $transaction (batch مصفوفة) بتعدّي بدون قفل لأنها ذرية على السيرفر
 * في نداء واحد — ومفيش interactive transactions في المشروع.
 * التكلفة: عمليات الداتابيز بتتنفذ واحد ورا التاني لكل isolate —
 * مقبولة لحجم منصة مدرسة، والصح أولوية على السرعة هنا.
 * ============================================================ */
var __dbTurnstile = { busy: false, since: 0 }

async function dbTurnstileAcquire() {
  for (;;) {
    if (!__dbTurnstile.busy || Date.now() - __dbTurnstile.since > 30000) {
      __dbTurnstile.busy = true
      __dbTurnstile.since = Date.now()
      return
    }
    await new Promise(function (r) { setTimeout(r, 3) })
  }
}

function dbTurnstileRelease() {
  __dbTurnstile.busy = false
}

/* غلاف تسلسلي لمندوب الموديل (db.video, db.siteConfig, ...) */
function serializeModelDelegate(delegate) {
  return new Proxy(delegate, {
    get: function (target, prop, receiver) {
      if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver)
      var v = Reflect.get(target, prop, receiver)
      if (typeof v !== 'function') return v
      return function () {
        var args = Array.prototype.slice.call(arguments)
        /* (ر13-فكس) الربط دايمًا بالهدف الخام — تمرير الـ Proxy كـ this
           كان بيخلي دوال Prisma الداخلية تعدي على الغلاف تاني وتطلب
           القفل وهي حاجزه = قفل ذاتي وجمود كامل (مُثبت حيًا) */
        return (async function () {
          await dbTurnstileAcquire()
          try {
            return await v.apply(target, args)
          } finally {
            dbTurnstileRelease()
          }
        })()
      }
    },
  })
}

/* غلاف تسلسلي للـ PrismaClient نفسه: الموديلات + raw queries مسلسلة،
   و$transaction/$connect/$disconnect/$on/$extends تعدّي زي ما هي */
function serializeDbClient(client) {
  var modelCache = {}
  return new Proxy(client, {
    get: function (target, prop, receiver) {
      if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver)
      var v = Reflect.get(target, prop, receiver)
      if (typeof v === 'function') {
        if (prop === '$transaction' || prop === '$connect' || prop === '$disconnect' || prop === '$on' || prop === '$extends') {
          return v
        }
        return function () {
          var args = Array.prototype.slice.call(arguments)
          /* (ر13-فكس) نفس القاعدة: الربط بالهدف الخام دايمًا */
          return (async function () {
            await dbTurnstileAcquire()
            try {
              return await v.apply(target, args)
            } finally {
              dbTurnstileRelease()
            }
          })()
        }
      }
      if (v && typeof v === 'object') {
        if (!modelCache[prop]) modelCache[prop] = serializeModelDelegate(v)
        return modelCache[prop]
      }
      return v
    },
  })
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
    return serializeDbClient(new PrismaClient({ adapter: adapter, log: [] }))
  }

  return serializeDbClient(new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  }))
}

export var db = _prisma || createPrismaClient()
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma._prismaInstance = db
}

export async function safeWrite(fn) {
  return withRetry(fn, 3, 300)
}
