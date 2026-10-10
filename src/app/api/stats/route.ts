// @ts-nocheck
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    /* (تسريع المنصة) الإحصائيات كانت 10 استعلامات منفصلة (8 متوازية + 2 ورا بعض)
       — كل واحد roundtrip كامل على Turso البعيدة = 1.3-2.3 ثانية في كل زيارة
       للصفحة الرئيسية ولوحة الأدمن. بقوا استعلام واحد بس (roundtrip واحد)
       + fallback للطريقة القديمة لو حصلت أي مشكلة في الجداول */
    try {
      var rows: any[] = await db.$queryRawUnsafe(`
        SELECT
          (SELECT COUNT(*) FROM "Student") AS totalStudents,
          (SELECT COUNT(*) FROM "Student" WHERE status = 'pending') AS pendingStudents,
          (SELECT COUNT(*) FROM "Student" WHERE status = 'approved') AS approvedStudents,
          (SELECT COUNT(*) FROM "Video") AS totalVideos,
          (SELECT COUNT(*) FROM "Homework") AS totalHomework,
          (SELECT COUNT(*) FROM "Exam") AS totalExams,
          (SELECT COUNT(*) FROM "Announcement") AS totalAnnouncements,
          (SELECT COUNT(*) FROM "Discussion") AS totalDiscussions,
          (SELECT COUNT(*) FROM "Payment" WHERE status = 'pending') AS pendingPayments
      `)
      var row = rows && rows[0] ? rows[0] : null
      if (row) {
        var result: Record<string, any> = {
          totalStudents: Number(row.totalStudents) || 0,
          pendingStudents: Number(row.pendingStudents) || 0,
          approvedStudents: Number(row.approvedStudents) || 0,
          totalVideos: Number(row.totalVideos) || 0,
          totalHomework: Number(row.totalHomework) || 0,
          totalExams: Number(row.totalExams) || 0,
          totalAnnouncements: Number(row.totalAnnouncements) || 0,
          totalDiscussions: Number(row.totalDiscussions) || 0,
          pendingPayments: Number(row.pendingPayments) || 0,
        }

        // Grades — استعلام خفيف ثاني (مش فيه طريقة آمنة تجمع DISTINCT في نفس السطر)
        try {
          var gradeRows: any[] = await db.$queryRawUnsafe(
            `SELECT DISTINCT grade FROM "Student" WHERE grade IS NOT NULL AND grade != ''`
          )
          result.grades = (gradeRows || []).map(function (g: any) { return g.grade })
        } catch (e2) {
          result.grades = []
        }

        return NextResponse.json(result)
      }
    } catch (rawErr) {
      /* نكمل على الطريقة القديمة تحت */
    }

    // Fallback — الطريقة القديمة (جداول ناقصة في قاعدة جديدة)
    var coreStats = await Promise.all([
      /* (2026-ز12) المرفوض اتحذف من المنصة — مش بيعد في الإجمالي */
      db.student.count({ where: { status: { notIn: ['rejected', 'refused'] } } }),
      db.student.count({ where: { status: 'pending' } }),
      db.student.count({ where: { status: 'approved' } }),
      db.video.count(),
      db.homework.count(),
      db.exam.count(),
      db.announcement.count(),
      db.discussion.count(),
    ])

    var result2: Record<string, any> = {
      totalStudents: coreStats[0],
      pendingStudents: coreStats[1],
      approvedStudents: coreStats[2],
      totalVideos: coreStats[3],
      totalHomework: coreStats[4],
      totalExams: coreStats[5],
      totalAnnouncements: coreStats[6],
      totalDiscussions: coreStats[7],
      pendingPayments: 0,
    }

    try {
      result2.pendingPayments = await db.payment.count({ where: { status: 'pending' } })
    } catch (e) {
      result2.pendingPayments = 0
    }

    try {
      var studentGrades = await db.student.findMany({
        select: { grade: true },
        distinct: ['grade'],
      })
      result2.grades = studentGrades.map(function(s) { return s.grade })
    } catch (e) {
      result2.grades = []
    }

    return NextResponse.json(result2)
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
