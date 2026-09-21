// ============================================================
// (و70) /api/admin/challenges/[id] — تعديل/تفعيل/حذف تحدي (أدمن)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'
import { isAdmin } from '@/lib/video-guard'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json().catch(() => null)
  if (!(await isAdmin(body?.adminId))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  try {
    const { id } = await params
    const data: any = {}
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
    if (typeof body.description === 'string') data.description = body.description.trim()
    if (typeof body.videoUrl === 'string' && body.videoUrl.trim()) data.videoUrl = body.videoUrl.trim()
    if (body.videoType === 'file' || body.videoType === 'youtube') data.videoType = body.videoType
    if (typeof body.active === 'boolean') data.active = body.active

    // تحدي نشط واحد في المرة
    if (data.active === true) {
      await safeWrite(() => db.challenge.updateMany({ data: { active: false } }))
    }

    await safeWrite(() => db.challenge.update({ where: { id }, data }))
    return NextResponse.json({ message: 'تم الحفظ ✅' })
  } catch (e: any) {
    return NextResponse.json({ error: 'فشل الحفظ — حاول تاني', detail: e?.message }, { status: 500 })
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
    await safeWrite(() => db.challengeSolution.deleteMany({ where: { challengeId: id } }))
    await safeWrite(() => db.challenge.delete({ where: { id } }))
    return NextResponse.json({ message: 'التحدي اتمسح ✅' })
  } catch (e: any) {
    return NextResponse.json({ error: 'فشل المسح — حاول تاني', detail: e?.message }, { status: 500 })
  }
}
