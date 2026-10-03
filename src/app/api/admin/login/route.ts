// @ts-nocheck
import { NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'
import { makeLibsqlClient, ensureSchema } from '@/lib/ensure-schema'

export var maxDuration = 10

/* (و76) طلب المستر حرفيًا: معرّف الدخول للوحة المشرف هو zicolainmath26 من غير
   @gmail.com — بالظبط زي ما اتحط. الإيميل الكامل القديم بيفضل مقبول كمان
   (توافقية مع الحسابات القديمة) + رقم الهاتف — كلهم بنفس كلمة المرور */
var DEFAULT_EMAIL = 'zicolainmath26'
var LEGACY_EMAIL = 'zicolainmath26@gmail.com'
var DEFAULT_PASSWORD = 'zicola2026#'
var ADMIN_PHONE = '44444444444'
var ADMIN_NAME = 'Zicola In Math'

/* (2026-ص5) بيانات المشرف الجديدة — طلب المستر حرفيًا:
   «هسجل دخول بالرقم والباسورد اللي عملتهم لك، وبعد كده دخول المشرفين
   هيطلب مني بريد الكتروني... فهحط كلمة ahmed بالانجليزي بعد كده الرقم
   اللي قلت لك عليه والباسورد هي هي»
   المعرّف = ahmed01118411148 (المسافات بتتشال بالسقاش فـ ahmed 01118411148
   بتشتغل كمان) والباسورد Zicolainmath2026 — وأول دخول بالبيانات دي
   بيترحّل صف الأدمن عليها (مصدر حقيقة واحد) — والبيانات القديمة بتفضل
   شغالة لحد المزامنة زي ما هي */
var MASTER_EMAIL = 'ahmed01118411148'
var MASTER_PASSWORD = 'Zicolainmath2026'

/* (و76) شفاء ذاتي: لو جدول Admin مش موجود في قاعدة جديدة (زي ما حصل في
   الإنتاج وسبب «خطأ في السيرفر» عند كل محاولة دخول) — نعمل السكيما كاملة
   ونجرب تاني بدل ما نرجّع 500 */
async function findAdminSafe() {
  try {
    return await db.admin.findFirst()
  } catch (e) {
    try {
      var client = makeLibsqlClient()
      if (client) {
        await ensureSchema(client)
        try { await client.close() } catch (e2) {}
      }
    } catch (e3) {}
    return await db.admin.findFirst()
  }
}

export async function POST(request) {
  var body
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  var email = body.email
  var password = body.password

  if (!email || !password) {
    return NextResponse.json({ error: 'البريد وكلمة المرور مطلوبين' }, { status: 400 })
  }

  // squash = strip ALL whitespace from both sides before comparing — the DB
  // may hold values like "sherif math@2026" / "mr sherif2026#" and the admin
  // may type them without (or with different) spaces. Never fail on spaces.
  var squash = function (v: any) { return String(v || '').replace(/\s+/g, '').toLowerCase() }
  var cleanEmail = squash(email)
  var cleanPassword = squash(password)

  /* (و76) المعرّفات المقبولة للدخول: zicolainmath26 (بدون gmail.com — طلب المستر)
     أو الإيميل الكامل القديم zicolainmath26@gmail.com (توافقية) أو الهاتف
     44444444444 — أو معرّف المشرف الجديد ahmed01118411148 (2026-ص5) —
     كلهم بنفس كلمة المرور المخزّنة أو الباسورد الجديد */
  var emailMatch = function (id: string): boolean {
    return id === squash(DEFAULT_EMAIL) || id === squash(LEGACY_EMAIL) || id === squash(ADMIN_PHONE) || id === squash(MASTER_EMAIL)
  }

  try {
    /* (تسريع المنصة) حارس مهلة: لو قاعدة Turso علّاقة/بطيئة جدًا، الطلب كان
       يفضل مفتوح لحد ما المتصفح يقطعه بالمهلة («انتهت مهلة الاتصال») —
       دلوقتي السيرفر بيرد برسالة واضحة خلال 6 ثواني بدل الانتظار المفتوح */
    var dbSlow = false
    var admin = null
    try {
      admin = await Promise.race([
        findAdminSafe(),
        new Promise(function (resolve, reject) {
          setTimeout(function () { reject(new Error('db-slow')) }, 6000)
        }),
      ])
    } catch (eRace) {
      if (eRace && eRace.message === 'db-slow') {
        dbSlow = true
        admin = null
      } else {
        admin = null /* القاعدة ردّت بخطأ — نكمل كأن مفيش أدمن (شفاء ذاتي تحت) */
      }
    }

    if (!admin) {
      if (dbSlow) {
        /* بطء قاعدة حقيقي — رسالة صريحة بدل «خطأ في السيرفر» المبهم */
        return NextResponse.json(
          { error: 'الاتصال بقاعدة البيانات بطيء دلوقتي — استنى ثواني وحاول تاني' },
          { status: 503 }
        )
      }
      if (!emailMatch(cleanEmail) || (cleanPassword !== squash(DEFAULT_PASSWORD) && cleanPassword !== squash(MASTER_PASSWORD))) {
        return NextResponse.json({ error: 'البريد أو كلمة المرور غلط' }, { status: 401 })
      }
      admin = await safeWrite(function() {
        return db.admin.create({
          data: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD, name: ADMIN_NAME },
        })
      })
    } else {
      /* (و75) بيقبل: معرّف الأدمن المخزّن (لو اتغير من الإعدادات) أو zicolainmath26
         أو الإيميل الكامل القديم أو رقم الهاتف أو ahmed01118411148 (2026-ص5) —
         وكلمة المرور: المخزّنة أو الجديدة Zicolainmath2026 */
      var storedOk = cleanEmail === squash(admin.email)
      var masterPwOk = cleanPassword === squash(MASTER_PASSWORD)
      if ((!storedOk && !emailMatch(cleanEmail)) || (cleanPassword !== squash(admin.password) && !masterPwOk)) {
        return NextResponse.json({ error: 'البريد أو كلمة المرور غلط' }, { status: 401 })
      }

      /* (2026-ص5) مزامنة بيانات المشرف الجديدة: أول دخول بـ ahmed01118411148 /
         Zicolainmath2026 وصف القاعدة لسه شايل بيانات تانية → نرحّل الصف عليهم
         (مصدر حقيقة واحد — نفس نمط ترحيلة و76) — الاسم بيفضل زي ما هو */
      if (cleanEmail === squash(MASTER_EMAIL) && masterPwOk && (squash(admin.email) !== squash(MASTER_EMAIL) || squash(admin.password) !== squash(MASTER_PASSWORD))) {
        try {
          await safeWrite(function() {
            return db.admin.update({ where: { id: admin.id }, data: { email: MASTER_EMAIL, password: MASTER_PASSWORD } })
          })
          admin.email = MASTER_EMAIL
          admin.password = MASTER_PASSWORD
        } catch (eSync) {}
      }

      /* (و76) ترحيلة لمرة واحدة: لو الحساب المخزّن لسه شايل الإيميل القديم
         الكامل zicolainmath26@gmail.com نحدّثه للمعرّف الجديد zicolainmath26
         بالظبط زي ما المستر عايز يشوفه. لو المعرّف متغيّر يدويًا من الإعدادات
         من قبل منلمسوش أبدًا */
      if (String(admin.email || '').toLowerCase() === LEGACY_EMAIL) {
        try {
          await safeWrite(function() {
            return db.admin.update({ where: { id: admin.id }, data: { email: DEFAULT_EMAIL } })
          })
          admin.email = DEFAULT_EMAIL
        } catch (e) {}
      }
    }

    var adminWithoutPassword = { id: admin.id, email: admin.email, name: admin.name, createdAt: admin.createdAt, updatedAt: admin.updatedAt }

    return NextResponse.json({
      message: 'تم تسجيل الدخول',
      admin: adminWithoutPassword,
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'خطأ في السيرفر' }, { status: 500 })
  }
}
