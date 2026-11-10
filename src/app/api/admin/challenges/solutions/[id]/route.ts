// ============================================================
// (و70) /api/admin/challenges/solutions/[id] — مسح حل طالب (أدمن)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'
import { isAdmin } from '@/lib/video-guard'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = new URL(request.url).searchParams.get('adminId')
  if (!(await isAdmin(adminId))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  try {
    const { id } = await params
    const rows = await db.challengeSolution.findMany({
      where: { challengeId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      solutions: rows.map((s) => ({
        id: s.id,
        studentName: s.studentName,
        phone: s.phone,
        content: s.content,
        createdAt: s.createdAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ solutions: [], error: e?.message })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = new URL(request.url).searchParams.get('adminId')
  if (!(await isAdmin(adminId))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  try {
    const { id } = await params
    await safeWrite(() => db.challengeSolution.delete({ where: { id } }))
    return NextResponse.json({ message: 'الحل اتمسح ✅' })
  } catch (e: any) {
    return NextResponse.json({ error: 'فشل المسح — حاول تاني', detail: e?.message }, { status: 500 })
  }
}
