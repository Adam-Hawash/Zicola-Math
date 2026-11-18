// @ts-nocheck
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* (و45) استخراج معرف اليوتيوب من أي صيغة (watch/youtu.be/shorts/live/embed)
   — بنجيب صورة الفيديو نفسه كصورة مصغرة افتراضية بطلب المستر */
function ytIdFrom(url: string): string {
  var m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/))([\w-]{11})/)
  return m ? m[1] : ''
}

export async function GET() {
  try {
    var images = await db.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } })

    /* (ر9) self-healing للمعرض — إصلاح «الصور مش موجودة / سيتم اضافتها قريبا»:
       فيه سجلات معرض قديمة الـ filePath بتاعها بيشاور على ملف Media مش موجود
       في القاعدة (اتحذف في مرحلة نقل قديمة) — الطالب كان يشوفها صورة مكسورة
       والصفحة تقول «سيتم اضافتها قريبا». بفحص وجود الملفات دفعة واحدة بـ IN
       وبرجع بس العناصر الحقيقية الشغالة + missingCount للتشخيص.
       الفحص كله في try داخلي — لو ضرب نرجع اللستة الكاملة زي ما هي (fail-open). */
    var visible: any[] = images
    var missingCount = 0
    try {
      var fileIds: string[] = []
      for (var gi = 0; gi < images.length; gi++) {
        var fp = String((images[gi] as any).filePath || '')
        if (fp.indexOf('/api/files/') === 0) {
          var fid = fp.slice('/api/files/'.length)
          if (fid) fileIds.push(fid)
        }
      }
      var existing = new Set<string>()
      if (fileIds.length) {
        var ph = fileIds.map(function () { return '?' }).join(',')
        var rows: any[] = (await db.$queryRawUnsafe(
          'SELECT id FROM Media WHERE id IN (' + ph + ')',
          ...fileIds
        )) as any[]
        for (var ri = 0; ri < rows.length; ri++) existing.add(String((rows[ri] as any).id))
      }
      visible = images.filter(function (g: any) {
        var fp2 = String(g.filePath || '')
        /* روابط خارجية (يوتيوب/لينك يدوي) تفضل زي ما هي — الفحص بس لملفات القاعدة */
        if (fp2.indexOf('/api/files/') !== 0) return true
        return existing.has(fp2.slice('/api/files/'.length))
      })
      missingCount = images.length - visible.length
    } catch (filterErr: any) {
      console.error('Gallery self-heal filter error:', filterErr)
      visible = images
      missingCount = 0
    }

    /* (ر9) no-store عشان الكاش (متصفح/حواف) ما يورينيش لستة قديمة بمفاتيح
       ملفات محذوفة — كان ده سبب «مرة الصور موجودة ومرة لأ» */
    return NextResponse.json(
      { images: visible, missingCount: missingCount },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Gallery fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch gallery', detail: error.message, code: error.code }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    var body = await request.json()
    var title = body.title || ''
    var type = body.type || 'image'
    var filePath = body.filePath || ''
    var videoUrl = body.videoUrl || ''
    /* (و45) الصورة المصغرة: رابط يدوي من الأدمن ← أوتوماتيك من اليوتيوب
       لو الفيديو لينك يوتيوب — عشان كل فيديو في المعرض يبان بصورته */
    var thumbnail = String(body.thumbnail || '').trim()
    if (!thumbnail && type === 'video') {
      var ytId = ytIdFrom(videoUrl)
      if (ytId) thumbnail = 'https://i.ytimg.com/vi/' + ytId + '/hqdefault.jpg'
    }

    if (type === 'video') {
      if (!videoUrl) {
        return NextResponse.json({ error: 'رابط الفيديو مطلوب' }, { status: 400 })
      }
    } else {
      if (!filePath && !videoUrl) {
        return NextResponse.json({ error: 'مسار الصورة أو الرابط مطلوب' }, { status: 400 })
      }
    }
       var count = await db.galleryImage.count()
    var image = await db.galleryImage.create({
      data: { title: title, filePath: filePath, type: type, videoUrl: videoUrl, thumbnail: thumbnail, sortOrder: body.sortOrder != null ? parseInt(body.sortOrder) : count },
    })
    return NextResponse.json({ image }, { status: 201 })
  } catch (error) {
    console.error('Gallery create error:', error)
    return NextResponse.json({ error: 'Failed to create gallery item', detail: error.message }, { status: 500 })
  }
}
