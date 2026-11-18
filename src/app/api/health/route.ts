// @ts-nocheck
// GET /api/health — production database diagnostic + AUTO-REPAIR.
// Tells EXACTLY why APIs would 500: which env vars are visible (names only,
// never values) + a live DB query test.
// NEW: if the connected database is missing core tables (e.g. the teacher
// swapped DATABASE_URL in Vercel to a fresh Turso database), the health check
// creates the full schema automatically — no more "every API 500s after I
// changed the database" outages. Just open /api/health once and it heals.
// (ر16) شفافية كاملة: الأخطاء الفعلية للعدادات بتترجع نصًا (كانت 'n/a'
// صامتة وغطت سبب العطل لأسابيع) + حالة الترميم المرحلي (ر16) بتظهر عشان
// نتابع تقارب الدورة تحت حد كلاود فلير 50 subrequest.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { makeLibsqlClient, ensureSchema, CORE_TABLES } from '@/lib/ensure-schema'

export async function GET() {
  var env = {
    TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DATABASE_URL_is_libsql: String(process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || '').indexOf('libsql://') === 0,
    TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    DATABASE_AUTH_TOKEN: !!process.env.DATABASE_AUTH_TOKEN,
  }

  var database = 'ok'
  var dbError = ''
  var counts = {}
  var countErrors = {}
  var autoFixed = false
  var repairedTables: string[] = []
  var schemaState: any = null
  try {
    await db.$queryRawUnsafe('SELECT 1')

    // ---- AUTO-REPAIR: (ر16) ترميم مرحلي محدود — كل نداء بيكمل مرحلة ----
    try {
      var client = makeLibsqlClient()
      if (client) {
        var outcome = await ensureSchema(client)
        if (outcome && outcome.repaired) {
          autoFixed = true
          repairedTables = outcome.missing || []
        }
        schemaState = {
          skipped: !!(outcome && outcome.skipped),
          partial: !!(outcome && outcome.partial),
          repairProgress: (outcome && outcome.repairProgress) || null,
        }
        try { await client.close() } catch (e) {}
      }
    } catch (e) {
      schemaState = { error: String(e && e.message ? e.message : e).substring(0, 200) }
    }

    // ---- (ر16) العدادات مع رسالة الخطأ الفعلية — 'n/a' الصامتة اتلغت ----
    var cnt = async function (key: string, model: string) {
      try {
        counts[key] = null
        counts[key] = await db[model].count()
      } catch (e) {
        counts[key] = 'n/a'
        countErrors[key] = String(e && e.message ? e.message : e).substring(0, 250)
      }
    }
    await cnt('students', 'student')
    await cnt('videos', 'video')
    await cnt('admins', 'admin')
  } catch (e) {
    database = 'fail'
    dbError = String(e && e.message ? e.message : e).substring(0, 300)
  }

  return NextResponse.json({
    status: database === 'ok' ? 'healthy' : 'unhealthy',
    env,
    database,
    autoFixed,
    repairedTables,
    schemaState,
    coreTables: CORE_TABLES.length,
    dbError,
    counts,
    countErrors,
    time: new Date().toISOString(),
  })
}
