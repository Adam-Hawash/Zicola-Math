// ============================================================
// /api/admin/db-cleanup — (81-c) أداة تنظيف قاعدة البيانات من الأدمن
// ============================================================
// السبب الجذري لتضخم قاعدة البيانات: مسح طالب/فيديو/امتحان/واجب كان بيسيب
// كل صفوفه «يتيمة» للأبد — الفورين كي مش مفروض على داتابيز الإنتاج
// (الجداول اتعملت بـ raw SQL فالـ onDelete: Cascade في البريزما مش شغال
// فعليًا عليها). الآلاف من صفوف تقدم المشاهدات/النتايج/الإشعارات/تذاكر
// التشغيل بتضل متراكمة على الفاضي لسنين.
//
// POST { adminId, dryRun } (+ ?vacuum=1 لضغط ملف الداتابيز)
//   dryRun=true  → عدّ الصفوف اليتيمة بس من غير أي حذف (فحص آمن)
//   dryRun=false → حذف نهائي للصفوف اليتيمة (بعد تأكيد من المستر)
//   ?vacuum=1    → محاولة VACUUM (ضغط الملف) — في try/catch لأن بعض
//                  المحركات بترفضها جوه transaction
// الرد: { ok:true, dryRun, results: [{table, found, deleted, error?}], vacuum? }
// كل جدول في try/catch لوحده — جدول ناقص أو قديم عمره ما يبوّظ الباقي.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'
import { isAdmin } from '@/lib/video-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CleanupTarget = { table: string; where: string; args?: unknown[] }

/* كل طالب يتيم: studentId متسجل ومش موجود في Student (الفاضي مستثنى —
   أعمدة زي Complaint.studentId وPlayTicket.studentId ليها DEFAULT '') */
var STUDENT_ORPHAN = "studentId != '' AND studentId NOT IN (SELECT id FROM Student)"

function buildTargets(): CleanupTarget[] {
  return [
    // ===== صفوف مفاتيحها studentId =====
    { table: 'StudentActivity', where: STUDENT_ORPHAN },
    { table: 'ExamResult', where: STUDENT_ORPHAN },
    { table: 'ExamResult', where: "examId != '' AND examId NOT IN (SELECT id FROM Exam)" },
    { table: 'HomeworkResult', where: STUDENT_ORPHAN },
    { table: 'HomeworkResult', where: "homeworkId != '' AND homeworkId NOT IN (SELECT id FROM Homework)" },
    { table: 'VideoProgress', where: STUDENT_ORPHAN },
    { table: 'VideoProgress', where: "videoId != '' AND videoId NOT IN (SELECT id FROM Video)" },
    { table: 'VideoAccess', where: STUDENT_ORPHAN },
    { table: 'VideoAccess', where: "videoId != '' AND videoId NOT IN (SELECT id FROM Video)" },
    { table: 'Notification', where: STUDENT_ORPHAN },
    { table: 'PlayTicket', where: STUDENT_ORPHAN },
    { table: 'PlayTicket', where: "videoId != '' AND videoId NOT IN (SELECT id FROM Video)" },
    { table: 'Payment', where: STUDENT_ORPHAN },
    { table: 'Complaint', where: STUDENT_ORPHAN },
    /* (2026-و84) الشكوى بعد حلها تتمسح من صفحة الأدمن — بتلم المخزون القديم */
    { table: 'Complaint', where: "status = 'resolved'" },
    { table: 'Discussion', where: STUDENT_ORPHAN },
    { table: 'PointsLedger', where: STUDENT_ORPHAN }, // جدول raw SQL من lib/points-ledger
    // ===== صفوف مفاتيحها videoId / groupId =====
    { table: 'VideoGroupSchedule', where: "videoId != '' AND videoId NOT IN (SELECT id FROM Video)" },
    { table: 'VideoGroupSchedule', where: "groupId != '' AND groupId NOT IN (SELECT id FROM StudentGroup)" },
    // ===== حسابات وروابط أولياء الأمور =====
    { table: 'ParentStudent', where: "studentId != '' AND studentId NOT IN (SELECT id FROM Student)" },
    { table: 'ParentStudent', where: "parentId != '' AND parentId NOT IN (SELECT id FROM Parent)" },
    { table: 'Parent', where: STUDENT_ORPHAN },
  ]
}

/* تذاكر التشغيل المنتهية (expiresAt < الآن) — تنسيق التواريخ في SQLite
   بيتغير حسب مين كتب الصف (Prisma vs raw) فبنكشف نوع القيمة المخزنة
   من أول صف ونقارن بالطريقة الصح بدل ما نكسر المقارنة */
async function expiredTicketsTarget(): Promise<CleanupTarget | null> {
  try {
    var rows: unknown[] = await db.$queryRawUnsafe('SELECT expiresAt FROM PlayTicket LIMIT 1')
    var list = rows as any[]
    var v = list && list[0] ? list[0].expiresAt : null
    if (v === null || v === undefined) {
      // مفيش صفوف أصلًا → مفيش حاجة تنمسح؛ شرط مستحيل عشان الرد يفضل متسق
      return { table: 'PlayTicket', where: '1 = 0' }
    }
    if (typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(String(v).trim()))) {
      // مخزنة رقم (epoch ms) — مقارنة رقمية
      return { table: 'PlayTicket', where: 'expiresAt IS NOT NULL AND CAST(expiresAt AS NUMERIC) < ?', args: [Date.now()] }
    }
    // مخزنة نص ISO — مقارنة نصية مع توقيت UTC الحالي بنفس صيغة SQLite
    return { table: 'PlayTicket', where: "expiresAt IS NOT NULL AND expiresAt != '' AND CAST(expiresAt AS TEXT) < datetime('now')" }
  } catch (e) {
    // جدول مش موجود — نستخناه
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    var body: Record<string, unknown> = {}
    try { body = await request.json() } catch (e) { /* جسم فاضي مقبول — التحقق من الأدمن هو الحاكم */ }
    var adminId = body && body.adminId ? String(body.adminId) : ''
    if (!(await isAdmin(adminId))) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    var dryRun = !(body && body.dryRun === false)
    var vacuum = new URL(request.url).searchParams.get('vacuum') === '1'

    var targets = buildTargets()
    var expired = await expiredTicketsTarget()
    if (expired) targets.push(expired)

    var results: Array<{ table: string; found: number; deleted: number; error?: string }> = []
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i]
      var args = (t.args as any[]) || []
      var row: { table: string; found: number; deleted: number; error?: string } = { table: t.table, found: 0, deleted: 0 }
      try {
        var cnt = (await db.$queryRawUnsafe('SELECT COUNT(*) as c FROM ' + t.table + ' WHERE ' + t.where, ...args)) as any[]
        row.found = Number(cnt && cnt[0] ? cnt[0].c : 0)
        if (!dryRun && row.found > 0) {
          var deleted = await safeWrite(function () {
            return db.$executeRawUnsafe('DELETE FROM ' + t.table + ' WHERE ' + t.where, ...args)
          })
          row.deleted = Number(deleted)
        }
      } catch (e: unknown) {
        row.error = String((e as any) && (e as any).message ? (e as any).message : e).slice(0, 160)
      }
      results.push(row)
    }

    var vacuumResult: { ok: boolean; error?: string } | null = null
    if (vacuum) {
      try {
        await db.$executeRawUnsafe('VACUUM')
        vacuumResult = { ok: true }
      } catch (e: unknown) {
        // بعض المحركات بترفض VACUUM جوه transaction — بنبلّغ بدل ما نكسر الطلب
        vacuumResult = { ok: false, error: String((e as any) && (e as any).message ? (e as any).message : e).slice(0, 160) }
      }
    }

    return NextResponse.json({ ok: true, dryRun: dryRun, results: results, vacuum: vacuumResult })
  } catch (error: unknown) {
    console.error('db-cleanup error:', error)
    return NextResponse.json({ error: 'فشل تنظيف قاعدة البيانات — ' + (error && (error as any).message ? String((error as any).message).slice(0, 120) : 'خطأ في السيرفر') }, { status: 500 })
  }
}
