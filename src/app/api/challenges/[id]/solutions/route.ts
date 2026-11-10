// ============================================================
// (و70) /api/challenges/[id]/solutions — الطالب يكتب حله تحت التحدي
// عام: الاسم + الحل (اختياري رقم التليفون) — بيترقم بترتيب الإرسال
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const studentName = String(body.studentName || '').trim()
    const phone = String(body.phone || '').trim()
    const content = String(body.content || '').trim()

    if (!studentName || studentName.length < 2) {
      return NextResponse.json({ error: 'اكتب اسمك الأول' }, { status: 400 })
    }
    if (!content) {
      return NextResponse.json({ error: 'اكتب حلك الأول' }, { status: 400 })
    }
    if (content.length > 4000) {
      return NextResponse.json({ error: 'الحل طويل جدًا (الحد 4000 حرف)' }, { status: 400 })
    }

    const challenge = await db.challenge.findUnique({ where: { id } })
    if (!challenge || !challenge.active) {
      return NextResponse.json({ error: 'التحدي مقفول أو مش موجود' }, { status: 404 })
    }

    const count = await db.challengeSolution.count({ where: { challengeId: id } })

    const created: any = await safeWrite(() =>
      db.challengeSolution.create({
        data: { challengeId: id, studentName: studentName.slice(0, 80), phone: phone.slice(0, 30), content },
      })
    )

    return NextResponse.json(
      {
        message: 'تم تسجيل حلك ✅',
        order: count + 1,
        solution: {
          id: (created as any)?.id || null,
          studentName: studentName.slice(0, 80),
          content,
          createdAt: (created as any)?.createdAt || new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (e: any) {
    return NextResponse.json({ error: 'حصلت مشكلة — حاول تاني', detail: e?.message }, { status: 500 })
  }
}
