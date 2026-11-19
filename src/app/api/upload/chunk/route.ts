// @ts-nocheck
// ============================================================
// /api/upload/chunk — نقطة استقبال الرفع المجزأ (ر20)
// ============================================================
// العطل الحرفي المُثبت حيًا: محرر «عدّل القص» (وكل عمليات الرفع في المنصة —
// الأوراق/الرسومات/الكتب/المعرض/إجابات الواجبات/الثامبنيلز) كانت بترسل إلى
// /api/upload/chunk وكانت الراوت دي **مش موجودة أصلًا** في المنصة →
// Next.js بيرد 404 text/plain «Server action not found.» → الكلاينت بيعمل
// res.json() على النص فيقع برسالة:
//   Unexpected token 'S', "Server act"... is not valid JSON
// (بلاغ المستر: «اعدل القص وادوس حفظ بيجيلي كده ومبيشتغلش»)
// الراوت دي موجودة في عقد chunkedUpload من أول يوم — اتكتبت هنا بنفس العقد
// حرفيًا عشان كل عمليات الرفع في المنصة ترجع تشغل فورًا.
//
// العقد (src/lib/chunked-upload.ts):
//   FormData { file, uploadId, chunkIndex, totalChunks, fileName, category }
//   غير نهائي → { ok: true, done: false, chunkIndex }
//   نهائي/جزء واحد → { ok: true, done: true, filePath: '/api/files/<id>',
//                      fileType, filename, size } — الحجم بالبايت دقيق
//                      لأن chunkedUpload بيتحقق byte-by-byte (SIZE_MISMATCH)
//
// التخزين: نفس نمط المنصة — جدول Media (base64) والخدمة عبر /api/files/[id]
//   أجزاء مؤقتة → category='__upload-chunk__' (مش بتظهر لأي قايمة/معرض)
//   الملف النهائي → category=<الطلب من الكلاينت>
//
// حدود workerd الآمنة: جزء ≤ 6MB — ملف ≤ 50MB — ≤ 32 جزء
// المحاذاة: الكلاينت بيقسم على 2,097,150 بايت (مضاعف 3) فدمج الـ base64
//   سليم رياضيًا — ولو وصلت أجزاء قديمة غير متحاذاة (كلاينت قديم) مسار
//   ثنائي احتياطي بيفك ويعيد التشفير للملفات ≤ 24MB بدل ما يخزن تالفة.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

var CHUNK_ROW_CATEGORY = '__upload-chunk__'
var MAX_CHUNK_BYTES = 6 * 1024 * 1024
var MAX_TOTAL_BYTES = 50 * 1024 * 1024
var MAX_TOTAL_CHUNKS = 32
var CHUNK_ASSEMBLY_FALLBACK_LIMIT = 24 * 1024 * 1024 // حجم base64

var SAFE_CATEGORY = /^[a-z0-9-]{1,40}$/

function safeName(name: string): string {
  var s = String(name || 'file')
  s = s.replace(/[\\/:*?"<>|\r\n]+/g, '_')
  return s.slice(0, 120) || 'file'
}

function extType(fileName: string, blobType: string): string {
  if (blobType && blobType.indexOf('/') > 0 && blobType !== 'application/octet-stream') return blobType
  var n = String(fileName || '').toLowerCase()
  if (n.indexOf('.pdf') > 0) return 'application/pdf'
  if (n.indexOf('.png') > 0) return 'image/png'
  if (n.indexOf('.jpg') > 0 || n.indexOf('.jpeg') > 0) return 'image/jpeg'
  if (n.indexOf('.webp') > 0) return 'image/webp'
  if (n.indexOf('.gif') > 0) return 'image/gif'
  if (n.indexOf('.mp4') > 0) return 'video/mp4'
  if (n.indexOf('.webm') > 0) return 'video/webm'
  if (n.indexOf('.m4v') > 0) return 'video/mp4'
  if (n.indexOf('.mov') > 0) return 'video/quicktime'
  if (n.indexOf('.mp3') > 0) return 'audio/mpeg'
  if (n.indexOf('.wav') > 0) return 'audio/wav'
  return 'application/octet-stream'
}

/** حجم الـ base64 المفكوك بالبايت بدون فك فعلي */
function b64Bytes(b64: string): number {
  var s = String(b64 || '')
  var len = s.length
  if (!len) return 0
  var pads = 0
  if (s.charAt(len - 1) === '=') pads++
  if (s.charAt(len - 2) === '=') pads++
  return Math.max(0, Math.floor((len * 3) / 4) - pads)
}

function b64ToBytes(b64: string): Uint8Array {
  var bin = atob(String(b64 || ''))
  var out = new Uint8Array(bin.length)
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: Uint8Array): string {
  var bin = ''
  var step = 0x8000
  for (var i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + step, bytes.length))) as any)
  }
  return btoa(bin)
}

/** تنظيف الأجزاء اليتيمة من عمليات نُسيت (أكتر من 24 ساعة) — استعلام موديل مُثبت البقاء */
async function sweepStaleChunks(): Promise<void> {
  try {
    await db.media.deleteMany({
      where: { category: CHUNK_ROW_CATEGORY, createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
    })
  } catch (e) { /* صامت — تنظيف إضافي بس */ }
}

export async function POST(req: NextRequest) {
  try {
    var form: FormData = await req.formData()
    var file = form.get('file') as File | null
    var uploadId = String(form.get('uploadId') || '').slice(0, 64)
    var chunkIndex = parseInt(String(form.get('chunkIndex') || '0'), 10)
    var totalChunks = parseInt(String(form.get('totalChunks') || '1'), 10)
    var fileName = safeName(String(form.get('fileName') || (file && file.name) || 'file'))
    var category = String(form.get('category') || 'general').slice(0, 40)

    if (!file) return NextResponse.json({ error: 'مفيش ملف في الطلب' }, { status: 400 })
    if (!uploadId || !/^[a-zA-Z0-9-]{6,64}$/.test(uploadId)) {
      return NextResponse.json({ error: 'معرّف الرفع ناقص أو غلط' }, { status: 400 })
    }
    if (!SAFE_CATEGORY.test(category)) {
      return NextResponse.json({ error: 'فئة رفع غير مسموحة' }, { status: 400 })
    }
    if (!Number.isFinite(chunkIndex) || !Number.isFinite(totalChunks) || totalChunks < 1 || totalChunks > MAX_TOTAL_CHUNKS) {
      return NextResponse.json({ error: 'أرقام الأجزاء غلط' }, { status: 400 })
    }
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return NextResponse.json({ error: 'رقم الجزء بره الحدود' }, { status: 400 })
    }
    if (file.size > MAX_CHUNK_BYTES) {
      return NextResponse.json({ error: 'الجزء أكبر من الحد المسموح (6MB)' }, { status: 413 })
    }
    if (file.size * totalChunks > MAX_TOTAL_BYTES + MAX_CHUNK_BYTES) {
      return NextResponse.json({ error: 'الملف أكبر من الحد المسموح (50MB)' }, { status: 413 })
    }

    var buf = Buffer.from(await file.arrayBuffer())
    if (!buf.length) return NextResponse.json({ error: 'الجزء فاضي' }, { status: 400 })
    var b64 = buf.toString('base64')
    var finalType = extType(fileName, String((file as any).type || ''))

    /* ===== المسار السريع: جزء واحد = الملف كامل ===== */
    if (totalChunks === 1) {
      var created = await db.media.create({
        data: {
          filename: fileName,
          filePath: '',
          fileType: finalType,
          fileSize: String(buf.length),
          data: b64,
          category: category,
        },
      })
      return NextResponse.json({
        ok: true, done: true, uploadId: uploadId,
        filePath: '/api/files/' + created.id,
        fileType: finalType, filename: fileName, size: buf.length,
      })
    }

    /* ===== الرفع المجزأ: تخزين الجزء =====
       (ر20-ب) استعلام موديل مُثبت البقاء — الإثبات الحي: الـ INSERT الخام
       $executeRawUnsafe كان بيرجع نجاح من غير بقاء الفعلي على الإنتاج
       (التجميع كان بيلاقي صفر أجزاء) بينما db.media.create بيثبت 100% */
    var chunkRowId = 'chunk-' + uploadId + '-' + String(chunkIndex)
    var chunkData = {
      filename: uploadId + '|' + String(chunkIndex),
      filePath: '__chunk/' + uploadId,
      fileType: finalType,
      fileSize: String(buf.length),
      data: b64,
      category: CHUNK_ROW_CATEGORY,
    }
    try {
      await db.media.upsert({ where: { id: chunkRowId }, update: { data: chunkData.data, fileSize: chunkData.fileSize }, create: Object.assign({ id: chunkRowId }, chunkData) })
    } catch (eUp) {
      // حماية إضافية — لو الـ upsert فشل لأي سبب نكمل بالإشاء العادي
      await db.media.create({ data: Object.assign({ id: chunkRowId }, chunkData) })
    }

    /* تنظيف عرضي للأجزاء اليتيمة */
    if (Math.random() < 0.08) void sweepStaleChunks()

    if (chunkIndex < totalChunks - 1) {
      // مش الجزء الأخير — خلاص اتخزن
      return NextResponse.json({ ok: true, done: false, chunkIndex: chunkIndex, uploadId: uploadId })
    }

    /* ===== الجزء الأخير: تجميع الملف كامل ===== */
    var rows: any[] = await db.media.findMany({
      where: { category: CHUNK_ROW_CATEGORY, filename: { startsWith: uploadId + '|' } },
      select: { id: true, filename: true, data: true },
    }) || []
    // الترتيب الرقمي الفعلي — الترتيب النصي في SQL بيرتب |10 قبل |2 وبيخرّب التجميع
    rows.sort(function (a: any, b: any) {
      return (parseInt(String(a.filename || '').split('|')[1], 10) || 0)
        - (parseInt(String(b.filename || '').split('|')[1], 10) || 0)
    })

    var have = new Set<string>()
    for (var i = 0; i < rows.length; i++) have.add(String(rows[i].filename || '').split('|')[1])
    var missing: number[] = []
    for (var k = 0; k < totalChunks; k++) { if (!have.has(String(k))) missing.push(k) }
    if (missing.length > 0 || rows.length < totalChunks) {
      // أجزاء ناقصة — الكلاينت يعيد الرفع كامل بـ uploadId جديد
      return NextResponse.json({ error: 'أجزاء ناقصة من الرفع (' + missing.join(',') + ') — جرب تاني' }, { status: 500 })
    }

    var totalB64 = 0
    for (var r = 0; r < rows.length; r++) totalB64 += String(rows[r].data || '').length
    if (totalB64 > (MAX_TOTAL_BYTES * 4) / 3 + 4096) {
      return NextResponse.json({ error: 'الملف أكبر من الحد المسموح' }, { status: 413 })
    }

    // محاذاة سريعة: كل الأجزاء غير الأخيرة لازم حجمها المفكوك مضاعف 3
    // (الكلاينت الحالي بيقسم 2,097,150 = مضاعف 3 → الدمج النصي سليم)
    var aligned = true
    for (var a = 0; a < rows.length; a++) {
      var rowIdx = String(rows[a].filename || '').split('|')[1]
      if (rowIdx !== String(totalChunks - 1) && b64Bytes(rows[a].data) % 3 !== 0) { aligned = false; break }
    }

    var finalB64 = ''
    if (aligned) {
      var parts: string[] = []
      for (var p = 0; p < rows.length; p++) parts.push(String(rows[p].data || ''))
      finalB64 = parts.join('')
    } else {
      // مسار احتياطي لكلاينت قديم (أجزاء غير متحاذاة) — فك ثنائي وإعادة تشفير
      if (totalB64 > CHUNK_ASSEMBLY_FALLBACK_LIMIT) {
        return NextResponse.json({ error: 'تعذر تجميع الملف بأمان — حدّث الصفحة (Ctrl+Shift+R) وجرب تاني' }, { status: 500 })
      }
      var partsU8: Uint8Array[] = []
      var totalLen = 0
      for (var q = 0; q < rows.length; q++) {
        var u8 = b64ToBytes(rows[q].data)
        partsU8.push(u8)
        totalLen += u8.length
      }
      var merged = new Uint8Array(totalLen)
      var off = 0
      for (var m = 0; m < partsU8.length; m++) { merged.set(partsU8[m], off); off += partsU8[m].length }
      finalB64 = bytesToB64(merged)
    }

    var finalSize = b64Bytes(finalB64)
    var finalRow = await db.media.create({
      data: {
        filename: fileName,
        filePath: '',
        fileType: finalType,
        fileSize: String(finalSize),
        data: finalB64,
        category: category,
      },
    })

    // مسح الأجزاء المؤقتة — استعلام موديل واحد
    try {
      await db.media.deleteMany({ where: { category: CHUNK_ROW_CATEGORY, filename: { startsWith: uploadId + '|' } } })
    } catch (eDel) { /* الأجزاء هتتنضف بالمكنسة بعد 24 ساعة */ }

    return NextResponse.json({
      ok: true, done: true, uploadId: uploadId,
      filePath: '/api/files/' + finalRow.id,
      fileType: finalType, filename: fileName, size: finalSize,
    })
  } catch (error: any) {
    console.error('upload/chunk error:', (error && error.message) || error)
    return NextResponse.json({ error: 'فشل رفع الملف — جرب تاني' }, { status: 500 })
  }
}
