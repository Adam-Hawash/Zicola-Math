// ============================================================
// /api/files/[id] — خدمة الملفات المخزنة base64 في جدول Media
// ============================================================
// حماية الفيديوهات المرفوعة من الجهاز:
//  - صور/مستندات → عامة زي ما هي (ثمبنيلز وواجبات)
//  - ملفات فيديو → ممنوعة تماماً بدون توكن موقّع صالح من /api/video-play
//    (التوكن مرتبط بالملف + بالطالب + بصلاحية ساعتين)
//  - الأدمن يدخل بـ adminId
// + دعم Range عشان الـ seek في الفيديو يشتغل صح
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin, verifyVideoToken } from '@/lib/video-guard'

/* (تسريع المنصة + تنظيف) حذف ملف من جدول Media — محمي بمعرّف الأدمن
   (نفس بوابة isAdmin بتاعة تشغيل الفيديو). بيستخدمه لوحة الأدمن لمسح
   أي ملف قديم مش محتاجه (زي الفيديو التعريفي) عشان مايفضلش ياكل
   مساحة من قاعدة البيانات */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var { id } = await params
    const { searchParams } = new URL(request.url)
    const adminOk = await isAdmin(searchParams.get('adminId'))
    if (!adminOk) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
    var removed = await db.media.delete({ where: { id } }).catch(function (e) {
      return null
    })
    if (!removed) {
      return NextResponse.json({ error: 'الملف مش موجود' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, deleted: id })
  } catch (error: any) {
    console.error('File delete error:', error)
    return NextResponse.json({ error: 'حذف الملف فشل' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var { id } = await params
    const { searchParams } = new URL(request.url)

    /* ===== (Z-1) ميتاداتا الملف للوحة الأدمن — اسم/نوع/حجم/تاريخ بدون البلوب.
       الفيديو التعريفي بيعرض «الحالة الحالية» (اسم الملف وتاريخه) منها.
       محمي بـ adminId زي الحذف بالظبط. ===== */
    if (searchParams.get('meta') === '1') {
      const adminOkMeta = await isAdmin(searchParams.get('adminId'))
      if (!adminOkMeta) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
      var metaRowsOnly: any[] = await db.$queryRawUnsafe(
        'SELECT id, filename, fileType, fileSize, category, createdAt FROM Media WHERE id = ? LIMIT 1',
        id
      ) as any[]
      var metaOnly = metaRowsOnly && metaRowsOnly[0]
      if (!metaOnly) {
        return NextResponse.json({ error: 'الملف مش موجود' }, { status: 404 })
      }
      return NextResponse.json({
        id: metaOnly.id,
        filename: metaOnly.filename || '',
        fileType: metaOnly.fileType || '',
        fileSize: Number(metaOnly.fileSize || 0),
        category: metaOnly.category || '',
        createdAt: metaOnly.createdAt || null,
      })
    }

    /* ===== (ر12) كاش الحافة لكلاود فلير — الحقيقة الجذرية لعطل «الصور مرة بتظهر ومرة لأ»:
       الملفات بتتخدم من base64 في القاعدة وفك التشفير كان بياكل حصة CPU المجانية
       (10ms) فكلاود فلير بيقتل العملية (error 1101 → 500 عشوائي حسب حرارة الـ isolate
       — الملف الكبير بيفشل ~40% من النداءات المثبتة حيًا على الإنتاج). دلوقتي: أي ملف
       عام بعد أول نجاح بيتكاش على حافة كلاود فلير نفسها، فكل الطلبات الجاية من نفس
       نقطة الشبكة بترجع من الكاش مباشرة بدون قاعدة بيانات ولا فك تشفير خالص. ===== */
    var edgeCache: any = null
    try { edgeCache = ((globalThis as any).caches && (globalThis as any).caches.default) || null } catch (e) {}
    var isRangeReq = !!request.headers.get('range')
    if (edgeCache && !isRangeReq) {
      try {
        var edgeHit = await edgeCache.match(request)
        if (edgeHit) return edgeHit
      } catch (e) {}
    }

    /* ===== (تسريع الفيديو) القراءة بالبايت من غير تحميل الملف كله =====
       القديم: كل طلب — أول كل seek — بيجيب الـ base64 كامل من القاعدة ويفك
       تشفيره كله، فالفيديو الكبير بيقف ومبيجرش.
       الجديد: length() + substr() في SQL — كل طلب بيجيب الحتة المطلوبة بس
       (أقصى 4MB) — الـ seek فوري مهما كان حجم الفيديو. */
    var metaRows: any[] = await db.$queryRawUnsafe(
      'SELECT length(data) AS L, substr(data, length(data) - 3, 4) AS tail, fileType, filename, category FROM Media WHERE id = ? LIMIT 1',
      id
    ) as any[]
    var meta = metaRows && metaRows[0]
    if (!meta || !Number(meta.L)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    var dataLen = Number(meta.L)
    var tail64 = String(meta.tail || '')
    var padCount = 0
    for (var pi = tail64.length - 1; pi >= 0 && tail64[pi] === '='; pi--) padCount++
    var totalBytes = Math.max(0, Math.floor(dataLen / 4) * 3 - padCount)

    var contentType = meta.fileType || 'application/octet-stream'
    var fileName = meta.filename || 'download'

    /* (2026-و40) تحميل بدل عرض داخلي: ?dl=1 → Content-Disposition: attachment
       — بتاع «الكتب والملازم» زرار تحميل. اسم الملف من Media.filename */
    const wantDownload = searchParams.get('dl') === '1'
    const safeFileName = (fileName || 'download').replace(/[\r\n"\\]/g, '_')
    const asciiFallback = safeFileName.replace(/[^\x20-\x7E]/g, '_') || 'download'
    var disposition = (wantDownload ? 'attachment' : 'inline') + '; filename="' + asciiFallback + '"'
    if (safeFileName !== asciiFallback) {
      try { disposition += "; filename*=UTF-8''" + encodeURIComponent(safeFileName) } catch (e) {}
    }

    // ===== بوابة الفيديو: ملفات الفيديو محمية دايماً =====
    /* (و93) استثناء فيديوهات المعرض: category='gallery' عامة زي يوتيوب.
       (2026-و84) الفيديو التعريفي العام — بيبص على القيمة الحالية كل طلب.
       (Z-4) كمان فيديو «تعرّف على المستر» (teacher_video_url) — نفس المنطق:
       أي واحد من الاتنين محطوط قيمته الحالية فيها id الملف → عام. */
    if (String(contentType).startsWith('video/') && meta.category !== 'gallery') {
      const token = searchParams.get('token')
      const reqId = searchParams.get('req') || ''
      const adminId = searchParams.get('adminId') || ''
      const tokenOk = token ? verifyVideoToken(token, id, reqId) : false
      const adminOk = adminId ? await isAdmin(adminId) : false
      var isPublicConfigVideo = false
      try {
        var pubRows: any[] = await db.$queryRawUnsafe(
          "SELECT value FROM SiteConfig WHERE key IN ('intro_video_url', 'teacher_video_url')"
        ) as any[]
        for (var ri = 0; ri < pubRows.length; ri++) {
          var pubVal = String(pubRows[ri].value || '')
          if (pubVal && pubVal.indexOf(id) !== -1) { isPublicConfigVideo = true; break }
        }
      } catch (e) { /* جدول ناقص — نكمل بالحماية العادية */ }
      if (!tokenOk && !adminOk && !isPublicConfigVideo) {
        return NextResponse.json(
          { error: 'غير مسموح — الفيديو بيتشغل من داخل المنصة بس' },
          { status: 403 }
        )
      }
    }

    // ===== دعم Range (seek في الفيديو) — فك تشفير الحتة المطلوبة بس =====
    const rangeHeader = request.headers.get('range')
    if (rangeHeader) {
      const m = rangeHeader.match(/bytes=(\d*)-(\d*)/)
      if (m) {
        var rStart = m[1] ? parseInt(m[1], 10) : 0
        var rEndReq = m[2] ? parseInt(m[2], 10) : totalBytes - 1
        if (isNaN(rStart) || rStart < 0) rStart = 0
        if (isNaN(rEndReq) || rEndReq >= totalBytes) rEndReq = totalBytes - 1
        if (rStart >= totalBytes || rStart > rEndReq) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': 'bytes */' + totalBytes },
          })
        }
        /* أقصى 4MB في الرد الواحد — المتصفح بيطلب الباقي لوحده (زي البث) */
        var rEnd = Math.min(rEndReq, rStart + 4 * 1024 * 1024 - 1)
        /* محاذاة الـ base64: كل 4 حروف = 3 بايت */
        var b64Start = Math.floor(rStart / 3) * 4
        var b64End = Math.min(dataLen, Math.ceil((rEnd + 1) / 3) * 4)
        var partRows: any[] = await db.$queryRawUnsafe(
          'SELECT substr(data, ?, ?) AS part FROM Media WHERE id = ? LIMIT 1',
          b64Start + 1, b64End - b64Start, id
        ) as any[]
        var part64 = partRows && partRows[0] ? String(partRows[0].part || '') : ''
        /* (ر12) Buffer بدل atob + لوب يدوي — فك تشفير محلي سريع ما يحرقش حصة CPU */
        var decodedBuf = Buffer.from(part64, 'base64')
        var innerOffset = rStart % 3
        var len = rEnd - rStart + 1
        var bytes = new Uint8Array(decodedBuf.subarray(innerOffset, innerOffset + len))
        return new NextResponse(bytes, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': disposition,
            'Content-Range': 'bytes ' + rStart + '-' + rEnd + '/' + totalBytes,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(len),
            'Cache-Control': 'private, no-store',
          },
        })
      }
    }

    /* من غير Range (صور/مستندات/طلبات كاملة) — الملف كامل زي ما هو */
    var fullRows: any[] = await db.$queryRawUnsafe(
      'SELECT data FROM Media WHERE id = ? LIMIT 1', id
    ) as any[]
    var full64 = fullRows && fullRows[0] ? String(fullRows[0].data || '') : ''
    if (!full64) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    /* (ر12) الجذر الحقيقي لعطل «الصور مرة بتظهر ومرة لأ» + خطأ 1101:
       atob + لوب JS يدوي على كل بايت كان بياكل حصة CPU المجانية (10ms) —
       صورة كبيرة (2MB+) = ملايين اللفات → كلاود فلير بيقتل العملية فجأة
       (500 عشوائي بيروح بالريلود — مثبت حيًا: نفس الصورة 5 نداءات = 200,500,200,200,500).
       Buffer.from فك تشفير محلي أسرع عشرات المرات ما يوصلش للحد أبدًا. */
    var bytes = new Uint8Array(Buffer.from(full64, 'base64'))

    var finalFile = new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        // الفيديو محمي فمفيش كاش عام عليه — الصور تنكاش عادي
        'Cache-Control': String(contentType).startsWith('video/')
          ? 'private, no-store'
          : 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    })
    /* (ر12) تخزين الرد في كاش الحافة (الصور العامة فقط — الفيديو no-store فمبيتخزنش):
       put بيتعمل في الخلفية waitUntil فالرد للطالب مبيتأخرش أبدًا —
       أول تحميل ناجح لكل نقطة شبكة بيكفي، وباقي الزوار بيجيبوا من الحافة */
    if (edgeCache && !String(contentType).startsWith('video/')) {
      try {
        var opennextApi = await import('@opennextjs/cloudflare')
        var cfCtx = opennextApi.getCloudflareContext()
        cfCtx.ctx.waitUntil(edgeCache.put(request, finalFile.clone()))
      } catch (e) { /* بيئة غير كلاود فلير — الكاش مش متاح ودي مش مشكلة */ }
    }
    return finalFile
  } catch (error: any) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
