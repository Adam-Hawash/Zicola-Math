// ============================================================
// (و70) /api/admin/challenges — إدارة التحديات (أدمن)
// GET: قايمة كل التحديات + عدد الحلول | POST: إنشاء/تفعيل تحدي
// (المستر يرفع فيديو يوتيوب أو ملف ويكتب عنوان ووصف)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'
import { isAdmin } from '@/lib/video-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const adminId = new URL(request.url).searchParams.get('adminId')
  if (!(await isAdmin(adminId))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  try {
    const rows = await db.challenge.findMany({ orderBy: { createdAt: 'desc' } })
    const counts = await db.challengeSolution.groupBy({ by: ['challengeId'], _count: { _all: true } })
    const countMap: Record<string, number> = {}
    for (const c of counts) countMap[c.challengeId] = c._count._all
    return NextResponse.json({
      challenges: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        videoUrl: r.videoUrl,
        videoType: r.videoType === 'file' ? 'file' : 'youtube',
        active: Boolean(r.active),
        solutionsCount: countMap[r.id] || 0,
        createdAt: r.createdAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ challenges: [], error: e?.message }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const adminId = body?.adminId
  if (!(await isAdmin(adminId))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  try {
    const title = String(body.title || '').trim()
    const description = String(body.description || '').trim()
    const videoUrl = String(body.videoUrl || '').trim()
    const videoType = body.videoType === 'file' ? 'file' : 'youtube'
    const activate = Boolean(body.active)

    if (!title) return NextResponse.json({ error: 'اكتب عنوان التحدي' }, { status: 400 })
    if (!videoUrl) return NextResponse.json({ error: 'حط لينك الفيديو أو ارفع ملف' }, { status: 400 })

    // تحدي نشط واحد في المرة — التفعيل بيقفل أي تحدي سابق
    if (activate) {
      await safeWrite(() => db.challenge.updateMany({ data: { active: false } }))
    }

    const created: any = await safeWrite(() =>
      db.challenge.create({
        data: { title, description, videoUrl, videoType, active: activate },
      })
    )
    return NextResponse.json({ message: activate ? 'التحدي اتعمل واتفعل ✅' : 'التحدي اتعمل (مش مفعّل) ✅', challenge: { id: created.id } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'فشل الحفظ — حاول تاني', detail: e?.message }, { status: 500 })
  }
}
