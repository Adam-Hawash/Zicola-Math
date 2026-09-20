// ============================================================
// QUESTION-FIGURES — قص رسومات الأسئلة من صفحة المصدر ورفعها (2026-و40-w)
// ============================================================
// بعد الاستخراج، كل سؤال فيه figure.bbox (نسب من صورة الصفحة كلها 0..1)
// بيتقص من صفحة المصدر وبيترفع كصورة مستقلة (chunkedUpload → /api/files/<id>)
// وبيتخزن في figure.url — عشان شاشة الطالب والمراجعة تعرض الرسمة جاهزة.
//
// المصدر ممكن يكون:
//   • وضع الصفحات (كتاب): مستند pdf.js مفتوح (doc) — بنرندر الصفحات المطلوبة بس
//     مع كاش (الصفحة الواحدة بتتقص ليها أكتر من رسمة).
//   • وضع الملف: File — لو PDF بنفتحه بـ openPdf، لو صورة بنعاملها صفحة 1
//     عبر createImageBitmap.
//
// أي فشل في القص/الرفع مش بيوقف العملية: بنسيب bbox زي ما هو
// (الواجهة بتعرض placeholder محايد) — وبنكمل باقي الرسومات.
// ============================================================

import { openPdf, renderPageToJpeg } from '@/lib/pdf-pages'
import { chunkedUpload } from '@/lib/chunked-upload'
import { splitMergedRegion } from '@/lib/figure-demerger'

export interface FigureCropSource {
  file?: File | null   // ملف المصدر (PDF أو صورة) — وضع الملف
  doc?: any | null     // مستند pdf.js مفتوح — وضع الصفحات
}

/* ============================================================
 * (و45) تصنيف موحّد MCQ/مقالي — طلب المستر الحرفي:
 *   «الطالب يجي يحل الواجب ما يلاقيش الاختيارات، يلاقي السؤال اللي في
 *    اختيارات على شكل رسومات يلاقي سؤال مقالي»
 * السؤال اللي له اختيارات — حتى لو الاختيارات نفسها **صور/رسومات**
 * (optionFigures بدون نص) — لازم يتصنف اختياري (mcq) ومطلقًا مقالي.
 * ============================================================ */

/** هل السؤال ده له اختيارات مرئية (صور/رسومات في الاختيارات)؟ */
export function hasVisualOptions(q: any): boolean {
  if (!q || typeof q !== 'object') return false
  if (!Array.isArray(q.optionFigures)) return false
  return q.optionFigures.some(function (of: any) {
    return of && typeof of === 'object' && (of.url || of.bbox)
  })
}

/**
 * الحكم الموحد: هل السؤال مقالي؟
 * مقالي = مفيش اختيارات نصية مرة واحدة ومفيش رسومات اختيارات.
 * أي اختيارات (نص أو صور) → اختياري زي ما هو.
 */
export function isWritingQuestion(q: any): boolean {
  if (!q || typeof q !== 'object') return true
  if (hasVisualOptions(q)) return false
  if (Array.isArray(q.options) && q.options.length > 0) {
    // اختيارات موجودة — لو كلها فاضية/N/A من غير رسومات → مقالي
    var allNA = q.options.every(function (o: any) {
      return !o || o === 'N/A' || o === 'لا يوجد' || String(o).trim() === ''
    })
    return allNA
  }
  return true
}

/* تطبيع bbox ذكي (و49): كل القيم 0..1 وw/h أكبر من صفر — وإلا null (مفيش قص)
   + لو النموذج رجّع مقياس 0..1000 (بروتوكول Gemini) أو pixels بنحوله تلقائي
   — ده كان بيخلي القص يتلغي بصمت مع إن الرسمة سليمة */
function sanitizeBbox(bbox: any): { x: number; y: number; w: number; h: number } | null {
  if (!bbox || typeof bbox !== 'object') return null
  var gv = function (v: any): number { var n = Number(v); return isFinite(n) ? n : NaN }
  var x = gv(bbox.x), y = gv(bbox.y), w = gv(bbox.w), h = gv(bbox.h)
  if ([x, y, w, h].some(function (n) { return isNaN(n) })) return null
  var maxV = Math.max(x, y, w, h)
  if (maxV > 1.5) { x = x / 1000; y = y / 1000; w = w / 1000; h = h / 1000 }
  if ((w <= 0 || w > 1.5) && x >= 0 && x <= 1 && w > x) { var w2 = w / 1000; if (w2 > 0 && w2 <= 1) { w = w2 - x } }
  if ((h <= 0 || h > 1.5) && y >= 0 && y <= 1 && h > y) { var h2 = h / 1000; if (h2 > 0 && h2 <= 1) { h = h2 - y } }
  x = Math.min(1, Math.max(0, x)); y = Math.min(1, Math.max(0, y))
  w = Math.min(1, Math.max(0, w)); h = Math.min(1, Math.max(0, h))
  if (w <= 0.005 || h <= 0.005) return null
  if (x + w > 1) w = Math.max(0.01, 1 - x)
  if (y + h > 1) h = Math.max(0.01, 1 - y)
  return { x: x, y: y, w: w, h: h }
}

/* رسم bitmap/dataURL على canvas بمقاسه الطبيعي (مع كاب) */
async function sourceToCanvas(src: { kind: 'bitmap'; bitmap: ImageBitmap } | { kind: 'dataurl'; dataUrl: string }): Promise<HTMLCanvasElement> {
  var canvas = document.createElement('canvas')
  if (src.kind === 'bitmap') {
    canvas.width = src.bitmap.width
    canvas.height = src.bitmap.height
    var ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas غير مدعم')
    ctx.drawImage(src.bitmap as any, 0, 0)
    return canvas
  }
  var img = new Image()
  img.src = src.dataUrl
  await new Promise<void>(function (resolve, reject) {
    img.onload = function () { resolve() }
    img.onerror = function () { reject(new Error('فشل تحميل صورة الصفحة')) }
  })
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  var ctx2 = canvas.getContext('2d')
  if (!ctx2) throw new Error('canvas غير مدعم')
  ctx2.drawImage(img, 0, 0)
  return canvas
}

/* ============================================================
 * (و52) تنقيط المحتوى — نفس منطق server-figures.refineByContent:
 * توسيع bbox بهامش ثم تقليم الهوامش البيضا — الرسمة تطلع كاملة وموسّطة
 * ============================================================ */
function refineByContentDom(canvas: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number): { x: number; y: number; w: number; h: number } {
  var fallback = { x: sx, y: sy, w: sw, h: sh }
  try {
    var ctx = canvas.getContext('2d')
    if (!ctx || sw < 16 || sh < 16) return fallback
    var img = ctx.getImageData(sx, sy, sw, sh)
    var d = img.data
    var rowHas = new Uint8Array(sh)
    var colHas = new Uint8Array(sw)
    var step = sw > 1000 ? 2 : 1
    for (var y = 0; y < sh; y++) {
      var base = y * sw * 4
      for (var x = 0; x < sw; x += step) {
        var i = base + x * 4
        var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        if (lum < 236) { rowHas[y] = 1; colHas[x] = 1 }
      }
    }
    var top = -1, bottom = -1, left = -1, right = -1
    for (var y2 = 0; y2 < sh; y2++) if (rowHas[y2]) { if (top < 0) top = y2; bottom = y2 }
    for (var x2 = 0; x2 < sw; x2++) if (colHas[x2]) { if (left < 0) left = x2; right = x2 }
    if (top < 0 || left < 0 || bottom < top || right < left) return fallback
    var mX = Math.max(10, Math.round(0.015 * sw))
    var mY = Math.max(10, Math.round(0.015 * sh))
    var rx = Math.max(sx, sx + left - mX)
    var ry = Math.max(sy, sy + top - mY)
    var rEx = Math.min(sx + sw, sx + right + 1 + mX)
    var rEy = Math.min(sy + sh, sy + bottom + 1 + mY)
    var rw = rEx - rx, rh = rEy - ry
    if (rw < 8 || rh < 8) return fallback
    return { x: rx, y: ry, w: rw, h: rh }
  } catch (eR) { return fallback }
}


/**
 * التأكد إن كل figure.url معباية: لكل سؤال فيه figure.bbox ومن غير url
 * بنقص الرسمة من صفحة المصدر ونرفعها ونعبي figure.url بالمسار.
 * (و44) كمان بنقص رسومات الاختيارات (optionFigures[i].bbox) أوتوماتيك —
 * ده كان سبب «الاختيارات اللي فيها رسومات ما بتتضيفش» — القص كان
 * بيتعامل مع رسمة السؤال بس!
 * onProgress(done, total) — لتوست «جهز الرسومات X من Y…».
 */
export async function ensureFigureUrls(
  questions: any[],
  source: FigureCropSource,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  /* هدف القص: { q, kind: 'q' | 'of', oi? } — رسمة سؤال أو رسمة اختيار */
  var targets: { q: any; kind: 'q' | 'of'; oi?: number }[] = []
  if (Array.isArray(questions)) {
    questions.forEach(function (q: any) {
      if (!q) return
      if (q.figure && q.figure.bbox && !q.figure.url) targets.push({ q: q, kind: 'q' })
      if (Array.isArray(q.optionFigures)) {
        q.optionFigures.forEach(function (of: any, oi: number) {
          if (of && of.bbox && !of.url) targets.push({ q: q, kind: 'of', oi: oi })
        })
      }
    })
  }
  var total = targets.length
  if (total === 0) return

  /* تجهيز مصدر الصفحات: مستند PDF مفتوح أو bitmap صورة
     (و48) لو فيه doc **و**file مع بعض: الـ doc ممكن يكون متدمر (destroyed)
     بعد الاستخراج — فبنحتفظ بالملف كمصدر احتياطي ونعيد فتحه لو الرندر فشل */
  var pdfDoc: any = null
  var imgBitmap: ImageBitmap | null = null
  var fallbackFile: File | null = null
  var fallbackDoc: any = null
  try {
    if (source.doc) {
      pdfDoc = source.doc
      if (source.file) fallbackFile = source.file
    } else if (source.file) {
      var f = source.file
      var isPdf = /\.(pdf)$/i.test(f.name || '') || f.type === 'application/pdf'
      if (isPdf) {
        var opened = await openPdf(f)
        pdfDoc = opened.doc
      } else {
        imgBitmap = await createImageBitmap(f)
      }
    }
  } catch (e) {
    /* من غير مصدر نقدر نقص منه — بنسيب الـ bbox والواجهة تعرض placeholder */
    if (onProgress) onProgress(0, total)
    return
  }
  if (!pdfDoc && !imgBitmap) {
    if (onProgress) onProgress(0, total)
    return
  }

  /* كاش صفحات مرسومة (الصفحة الواحدة ممكن يطلع منها أكتر من رسمة) */
  var pageCanvasCache: Record<number, HTMLCanvasElement> = {}

  var getPageCanvas = async function (page: number): Promise<HTMLCanvasElement | null> {
    if (pageCanvasCache[page]) return pageCanvasCache[page]
    var canvas: HTMLCanvasElement | null = null
    /* 1) المحاولة من المستند المفتوح */
    if (pdfDoc) {
      try {
        var numPages = Number(pdfDoc.numPages) || 0
        if (page >= 1 && (numPages <= 0 || page <= numPages)) {
          /* (و52) رندر أعلى 2000/0.9 — ده المصدر اللي القص بيتقص منه */
          var dataUrl = await renderPageToJpeg(pdfDoc, page, 2000, 0.9)
          canvas = await sourceToCanvas({ kind: 'dataurl', dataUrl: dataUrl })
        }
      } catch (e) { canvas = null }
      /* 2) (و48) المستند فشل (متدمر/مقفول) → إعادة فتح الملف الأصلي */
      if (!canvas && fallbackFile && !fallbackDoc) {
        try { fallbackDoc = (await openPdf(fallbackFile)).doc } catch (eFb) { fallbackDoc = null }
      }
      if (!canvas && fallbackDoc) {
        try {
          var dataUrl2 = await renderPageToJpeg(fallbackDoc, page, 2000, 0.9)
          canvas = await sourceToCanvas({ kind: 'dataurl', dataUrl: dataUrl2 })
        } catch (eFb2) { canvas = null }
      }
    }
    /* 3) صورة مفردة (صفحة 1) */
    if (!canvas && imgBitmap && page === 1) {
      try { canvas = await sourceToCanvas({ kind: 'bitmap', bitmap: imgBitmap }) } catch (eB) { canvas = null }
    }
    if (canvas) pageCanvasCache[page] = canvas
    return canvas
  }

  var done = 0
  for (var i = 0; i < targets.length; i++) {
    var tgt = targets[i]
    var q = tgt.q
    try {
      var fig = tgt.kind === 'q' ? q.figure : (q.optionFigures[tgt.oi || 0] || null)
      var bbox = sanitizeBbox(fig && fig.bbox)
      if (!bbox) { done++; if (onProgress) onProgress(done, total); continue }
      var page = parseInt(String((fig && fig.page) || q.sourcePage || 1), 10) || 1
      var pageCanvas = await getPageCanvas(page)
      if (!pageCanvas) { done++; if (onProgress) onProgress(done, total); continue }

      /* (و52) padding حوالين bbox — رسمة السؤال هامش أكبر، رسومات الاختيارات أقل
         (عشان ماحضنش رسمة الاختيار اللي جنبه في الشبكة) */
      var padFrac = tgt.kind === 'q' ? 0.025 : 0.012
      var sx0 = Math.max(0, Math.floor((bbox.x - padFrac) * pageCanvas.width))
      var sy0 = Math.max(0, Math.floor((bbox.y - padFrac) * pageCanvas.height))
      var ex0 = Math.min(pageCanvas.width, Math.ceil((bbox.x + bbox.w + padFrac) * pageCanvas.width))
      var ey0 = Math.min(pageCanvas.height, Math.ceil((bbox.y + bbox.h + padFrac) * pageCanvas.height))
      var sw0 = ex0 - sx0, sh0 = ey0 - sy0
      if (sw0 < 8 || sh0 < 8) { done++; if (onProgress) onProgress(done, total); continue }
      /* (و52) رصّ القص على المحتوى الفعلي — تقليم البيض جوه المنطقة الموسعة */
      var reg = refineByContentDom(pageCanvas, sx0, sy0, sw0, sh0)
      /* (و53) فك الالتحام — لو المنطقة التهمت رسمة مجاورة (رسمتين جنب بعض
         والسؤال فيه رسمة واحدة) بنقص الكتلة اللي bbox السؤال بيشاور عليها بس */
      var pc53: HTMLCanvasElement = pageCanvas
      var regD = splitMergedRegion(function (gx: number, gy: number, gw: number, gh: number) {
        try {
          var gctx = pc53.getContext('2d')
          if (!gctx) return null
          var gimg = gctx.getImageData(gx, gy, gw, gh)
          return { d: gimg.data, w: gimg.width, h: gimg.height }
        } catch (eG) { return null }
      }, reg, { x0: bbox.x * pc53.width, y0: bbox.y * pc53.height, x1: (bbox.x + bbox.w) * pc53.width, y1: (bbox.y + bbox.h) * pc53.height })
      var sw = regD.w, sh = regD.h, sx = regD.x, sy = regD.y
      if (sw < 8 || sh < 8) { done++; if (onProgress) onProgress(done, total); continue }

      /* تصغير لأقصى ضلع 1600 — الحفاظ على النسبة */
      var scale = Math.min(1, 1600 / Math.max(sw, sh))
      var outW = Math.max(8, Math.round(sw * scale))
      var outH = Math.max(8, Math.round(sh * scale))
      var out = document.createElement('canvas')
      out.width = outW; out.height = outH
      var octx = out.getContext('2d')
      if (!octx) { done++; if (onProgress) onProgress(done, total); continue }
      octx.fillStyle = '#ffffff'
      octx.fillRect(0, 0, outW, outH)
      octx.imageSmoothingEnabled = true
      octx.imageSmoothingQuality = 'high'
      octx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, outW, outH)

      var blob = await new Promise<Blob | null>(function (resolve) {
        out.toBlob(function (b: Blob | null) { resolve(b) }, 'image/jpeg', 0.92)
      })
      if (!blob) { done++; if (onProgress) onProgress(done, total); continue }

      var asFile = new File([blob], 'figure_q' + (i + 1) + '.jpg', { type: 'image/jpeg' })
      var up = await chunkedUpload(asFile, 'exam-figures')
      if (up && up.filePath && /^\/api\/files\//.test(up.filePath)) {
        if (tgt.kind === 'q') {
          q.figure.url = up.filePath
        } else {
          var ofs = Array.isArray(q.optionFigures) ? q.optionFigures : []
          while (ofs.length <= (tgt.oi || 0)) ofs.push(null)
          ofs[tgt.oi || 0] = Object.assign({}, ofs[tgt.oi || 0] || {}, { url: up.filePath, bbox: fig.bbox, page: fig.page })
          q.optionFigures = ofs
        }
      }
    } catch (eFig) {
      /* فشل سؤال واحد مش بيوقف الباقي — bbox بيفضل موجود */
    }
    done++
    if (onProgress) onProgress(done, total)
  }
}
