// ============================================================
// (Z-1) intro-video — المصدر الموحد لمنطق الفيديو التعريفي
// ============================================================
// المفتاح في SiteConfig: intro_video_url (موجود من و70)
//  • لينك (YouTube / Google Drive / Vimeo) → بيتطبع لصيغة embed
//  • ملف مرفوع من الجهاز → /api/files/<mediaId> (بنية chunk الموجودة)
//  • فاضي → القسم كله بيختفي من الـ DOM (لا صندوق فاضي ولا placeholder)
// الاتنين (الأدمن + صفحة الطالب) بيقرؤوا ويعرضوا من نفس الدوال دي.
// ============================================================

export type IntroVideoKind = 'none' | 'youtube' | 'drive' | 'vimeo' | 'file' | 'link'

export function youTubeId(u: string): string | null {
  if (!u) return null
  var s = String(u)
  /* (Z-1) youtube-nocookie.com كمان — لينك embed المخزن لازم يتعرف عليه تاني
     (idempotent) عشان الحالة تقول «لينك يوتيوب» والطالب يشوف iframe مش video */
  var m = s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? m[1] : null
}

/* Google Drive file ID من أي صيغة share */
export function driveFileId(u: string): string | null {
  if (!u) return null
  var s = String(u)
  var m = s.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (m) return m[1]
  m = s.match(/[?&]id=([\w-]+)/)
  if (m && s.indexOf('drive.google.com') !== -1) return m[1]
  m = s.match(/docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/([\w-]+)/)
  return m ? m[1] : null
}

/* Vimeo video ID */
export function vimeoId(u: string): string | null {
  if (!u) return null
  var m = String(u).match(/vimeo\.com\/(?:video\/)?(\d{6,})/)
  return m ? m[1] : null
}

/* ملف فيديو مرفوع أو بامتداد فيديو */
export function isVideoFileUrl(u: string): boolean {
  if (!u) return false
  var s = String(u)
  if (s.indexOf('/api/files/') === 0) return true
  return /\.(mp4|webm|mov|m4v|ogg|ogv)(\?.*)?$/i.test(s)
}

/* نوع القيمة المخزنة */
export function introVideoKind(url: string | null | undefined): IntroVideoKind {
  var u = String(url || '').trim()
  if (!u) return 'none'
  if (youTubeId(u)) return 'youtube'
  if (driveFileId(u)) return 'drive'
  if (vimeoId(u)) return 'vimeo'
  if (isVideoFileUrl(u)) return 'file'
  return 'link'
}

/* عناوين الـ embed الجاهزة للعرض (iframe src) */
export function introEmbedSrc(url: string): string | null {
  var u = String(url || '').trim()
  if (!u) return null
  var yt = youTubeId(u)
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt + '?rel=0'
  var dv = driveFileId(u)
  if (dv) return 'https://drive.google.com/file/d/' + dv + '/preview'
  var vm = vimeoId(u)
  if (vm) return 'https://player.vimeo.com/video/' + vm
  return null
}

/* ============================================================
 * تطبيع لينك المستر لصيغة embed قبل الحفظ (طلب المهمة حرفيًا):
 *  • YouTube watch → youtube-nocookie embed
 *  • Google Drive share → /preview
 *  • Vimeo → player.vimeo.com/video/<id>
 * أي لينك تاني / مسار ملف مرفوع بيرجع زي ما هو.
 * ============================================================ */
export function normalizeIntroVideoUrl(raw: string): string {
  var u = String(raw || '').trim()
  if (!u) return ''
  /* شيل @ و <> اللي بييجوا مع النسخ من بعض المصادر */
  u = u.replace(/^[<@>\s]+/, '').replace(/[>\s]+$/, '')
  if (/^https?:\/\//i.test(u)) {
    var yt = youTubeId(u)
    if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt + '?rel=0'
    var dv = driveFileId(u)
    if (dv) return 'https://drive.google.com/file/d/' + dv + '/preview'
    var vm = vimeoId(u)
    if (vm) return 'https://player.vimeo.com/video/' + vm
  }
  return u
}

/* لو القيمة مسار ملف مرفوع → media id بتاعه (لمسح الملف اليتيم) */
export function introMediaId(url: string | null | undefined): string | null {
  var u = String(url || '').trim()
  if (!u) return null
  var m = u.match(/\/api\/files\/([\w-]+)/)
  return m ? m[1] : null
}

/* حجم ملف مقروء */
export function formatIntroSize(bytes: number): string {
  var b = Number(bytes || 0)
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  if (b >= 1024) return (b / 1024).toFixed(0) + ' KB'
  return String(b) + ' B'
}
