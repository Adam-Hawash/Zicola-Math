// ============================================================
// (2026-و40) PDF-PAGES — قراءة كتاب PDF صفحة-صفحة على المتصفح
// ============================================================
// هدفها تاب «كتاب — صفحات محددة» في استخراج AI: المستر بفتح كتاب كبير،
// يحدد من صفحة لصفحة، والمنصة تصور كل صفحة وتبعتها للـ AI يستخرج الأسئلة.
// - pdfjs-dist بيتحمّل **ديناميكي** جوه الدوال — عمره ما بيتنفذ على السيرفر
//   (SSR) ولا بيتحمل في الباندل الرئيسي.
// - الـ worker ملف ثابت في public/pdf.worker.min.mjs (متكمِت من pdfjs-dist).
// - renderPageToJpeg بيرجّع dataURL base64 — نفس الشكل اللي /api/ai-extract-pages
//   بيستقبله ويرفعه لـ Gemini كـ inlineData.
// ============================================================

export interface OpenedPdf {
  numPages: number
  doc: any
}

const PDF_WORKER_SRC = '/pdf.worker.min.mjs'

/* (ر8 — نشر Cloudflare Workers) pdf.js بيتحمّل كملف ثابت من public وقت
   التشغيل (نفس نسخة pdfjs-dist بالظبط) بدل ما يتلفّ في أي باندل:
   - /* turbopackIgnore: true *‎/ بيخلي Turbopack (باندل المتصفح + الـ SSR)
     يتخطى الاستيراد خالص — Turbopack كان بيرفض أي استيراد ديناميكي
     مش قابل للحل في باندل العميل بـ «Can't resolve <dynamic>».
   - esbuild (باندل الـ Worker في OpenNext) برضه ما بيتبعش المتغير —
     فpdf.js مش جوه الـ Worker بتاع كلاود فلير خالص (كان بيضخّمه
     فوق حد الخطة المجانية 3MB مضغوط).
   - على المتصفح: استيراد ESM من نفس الأصل — نسخة مطابقة للي كان
     الباندلر بيلفّها، والـ worker ملف ثابت جاهز من قبل.
   - على السيرفر: لو حد ندّى عليها (مستحيل — كل دوال الملف متصفحية)
     الاستيراد بيفشل ويتمسك في try/catch النداء. */
const PDFJS_URL = ['/', 'pdfjs.min.mjs'].join('')

/* استيراد runtime غير مرئي لأي باندلر: Turbopack ما بيشوفش صيغة import
   أصلًا فما بيحاول يحلّ الرابط (كان بيكسر البناء بـ Can't resolve)،
   وesbuild بتاع OpenNext ما بيتبعهش فpdf.js مش جوه الـ Worker.
   على المتصفح الاستيراد بيحصل طبيعي من نفس الأصل. */
var runtimeImport: (u: string) => Promise<any> = Function('u', 'return import(u)') as unknown as (u: string) => Promise<any>

/** فتح ملف PDF على المتصفح — بيرجّع عدد الصفحات + مستند pdf.js */
export async function openPdf(file: File): Promise<OpenedPdf> {
  var pdfjs: any = await runtimeImport(PDFJS_URL)
  if (!pdfjs) throw new Error('pdf.js مش متاح')
  try { pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC } catch (e) {}
  var data = await file.arrayBuffer()
  var doc = await pdfjs.getDocument({ data: data, isEvalSupported: false }).promise
  return { numPages: doc.numPages || 0, doc: doc }
}

/**
 * تحويل صفحة واحدة لصورة JPEG base64 (dataURL).
 * maxDim = أقصى بُعد (عرض/طول) — بنحافظ على النسبة، وquality بيوازن
 * بين وضوح النص للـ AI وحجم الطلب.
 */
export async function renderPageToJpeg(
  doc: any,
  pageNumber: number,
  maxDim: number = 1400,
  quality: number = 0.72
): Promise<string> {
  return renderPageToImage(doc, pageNumber, maxDim, 'image/jpeg', quality, 3)
}

/**
 * (2026-G-1) رندر صفحة **بدون فقدان** — PNG dataURL.
 * مخصصة لقص الرسمات: الصفحة تتندر مرة واحدة بدقة عالية وLossless،
 * والقص النهائي ياخد المنطقة بالدقة الطبيعية من غير أي JPEG وسيط
 * بيضيّع الجودة (كان سبب «الجودة ضعيفة — عايزها زي ما هي»).
 * maxDim = أقصى بُعد مطلوب، maxScale = سقف تكبير رندر pdf.js (افتراضي 4x).
 */
export async function renderPageToPng(
  doc: any,
  pageNumber: number,
  maxDim: number = 3200,
  maxScale: number = 4
): Promise<string> {
  return renderPageToImage(doc, pageNumber, maxDim, 'image/png', 1, maxScale)
}

async function renderPageToImage(
  doc: any,
  pageNumber: number,
  maxDim: number,
  format: 'image/jpeg' | 'image/png',
  quality: number,
  maxScale: number
): Promise<string> {
  var page = await doc.getPage(pageNumber)
  var baseViewport = page.getViewport({ scale: 1 })
  var longest = Math.max(baseViewport.width, baseViewport.height) || maxDim
  var scale = Math.min(maxScale, maxDim / longest)
  if (!isFinite(scale) || scale <= 0) scale = 1
  var viewport = page.getViewport({ scale: scale })
  var canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  var ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('متصفحك مش مدعم رسم الصفحات (canvas)')
  /* خلفية بيضا — بعض الكتب شفافة وتطلع سودة من غيرها */
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport: viewport }).promise
  page.cleanup()
  var dataUrl = canvas.toDataURL(format, quality)
  canvas.width = 0; canvas.height = 0
  return dataUrl
}
