// ============================================================
// (و70) /api/challenges/active — التحدي النشط + حلول الطلاب بترتيبها
// طلب المستر حرفيًا: «المدرس يرفع فيديو → كل طالب يكتب حله تحت
// → الحلول تظهر بترتيب ما كتبها الطلاب» — عام بدون تسجيل
// ============================================================
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const active = await db.challenge.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!active) return NextResponse.json({ challenge: null, solutions: [] })

    const rows = await db.challengeSolution.findMany({
      where: { challengeId: active.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      challenge: {
        id: active.id,
        title: active.title,
        description: active.description,
        videoUrl: active.videoUrl,
        videoType: active.videoType === 'file' ? 'file' : 'youtube',
        active: Boolean(active.active),
        createdAt: active.createdAt,
      },
      // بترتيب ما كتبها الطلاب (الأقدم أولًا) — طلب المستر
      solutions: rows.map((s) => ({
        id: s.id,
        studentName: s.studentName,
        content: s.content,
        createdAt: s.createdAt,
      })),
    })
  } catch {
    // قاعدة البيانات لسه مش جاهزة — صفحة بدون تحدي بدل ما تبوظ
    return NextResponse.json({ challenge: null, solutions: [] })
  }
}
