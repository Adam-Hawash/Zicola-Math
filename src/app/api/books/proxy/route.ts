// @ts-nocheck
// ============================================================
// (2026-و44) /api/books/proxy?url=… — بروكسي تحميل PDF من لينك خارجي
// طلب المستر: «الكتاب المضاف باللينك يبقى ثابت في صفحة الاستخراج —
// لو دوست عليه تظهر صفحات الكتاب وأختار الصفحات» — pdf.js في المتصفح
// مش بيوصل للينكات الخارجية (CORS) — فبنمرر التحميل من هنا (same-origin).
//
// (Z-40e) إصلاح «ما بيعرفش يقرأ الدرايف»: لينكات جوجل درايف بقت بتتحول
// لتحميل مباشر حقيقي (usercontent/uc + confirm=t) ولو جوجل رجّعت صفحة
// HTML بنجرّب المرشح التالي — ولو كله فشل رسالة واضحة للمستر.
// (Z-41) طبقة إضافية فوق Z-40e بعد الشكوى الحقيقية من المستر:
//   1) صفحة تأكيد جوجل للملفات الكبيرة (virus-scan interstitial) — كان
//      البروكسي بيرفضها كـ HTML ويفشل «مش عارف يقرا الملف». دلوقتي بنفكّ
//      الـ uuid من الفورم المخفي ونجيب الملف الحقيقي بنفس النداء.
//   2) اسم الملف الحقيقي بينتقل للواجهة (X-Proxy-Filename) — بدل
//      «كتاب من رابط» وbook-1730000.pdf اللي المستر كان بيشوفهم.
//   3) dl=1 → تحميل مباشر (attachment) بدل العرض — لزرار «تحميل».
// ملاحظات أمان: http/https بس + ممنوع localhost/private IPs (SSRF) +
// حجم أقصى 250MB — والاستجابة بتتحول stream زي ما هي.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { directDownloadCandidates, isHtmlContentType, extractDriveFileId, buildConfirmedDriveUrl } from '@/lib/drive-url'

var MAX_BYTES = 250 * 1024 * 1024

function isBlockedHost(hostname: string): boolean {
  var h = String(hostname || '').toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  /* 127.x / 10.x / 172.16-31.x / 192.168.x / 169.254.x / ::1 */
  var m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    var a = parseInt(m[1], 10)
    var b = parseInt(m[2], 10)
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
  }
  return false
}

/* (Z-41) استخراج اسم الملف من Content-Disposition بتاع جوجل/السيرفر
   بييدعم filename*=UTF-8''… (عربي) وfilename="…" العادي */
function filenameFromDisposition(cd: string): string {
  var s = String(cd || '')
  if (!s) return ''
  var mStar = s.match(/filename\*=(?:UTF-8|utf-8)''([^;]+)/)
  if (mStar && mStar[1]) {
    try { return decodeURIComponent(String(mStar[1]).trim().replace(/^"|"$/g, '')) } catch (eD) {}
  }
  var m = s.match(/filename="?([^";]+)"?/)
  if (m && m[1]) {
    var raw = String(m[1]).trim()
    try { return decodeURIComponent(raw) } catch (eP) { return raw }
  }
  return ''
}

export async function GET(request: NextRequest) {
  try {
    var sp = new URL(request.url).searchParams
    var url = sp.get('url') || ''
    var asDownload = sp.get('dl') === '1'
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'لينك غير صالح' }, { status: 400 })
    }
    var candidates = directDownloadCandidates(url)
    var lastStatus = 0
    var htmlBlocked = false

    for (var ci = 0; ci < candidates.length; ci++) {
      var parsed = new URL(candidates[ci])
      if (isBlockedHost(parsed.hostname)) {
        return NextResponse.json({ error: 'اللينك غير مسموح' }, { status: 400 })
      }
      var upstream: Response | null = null
      try {
        upstream = await fetch(parsed.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (ZicolaBooksProxy)',
            'Accept': '*/*',
          },
          redirect: 'follow',
          cache: 'no-store',
        })
      } catch (eFetch) { lastStatus = 0; continue }
      lastStatus = upstream.status
      if (!upstream.ok || !upstream.body) continue
      var ct = String(upstream.headers.get('content-type') || '')
      /* (Z-40e) جوجل بترجّع صفحة HTML (عارض/تأكيد فيروسات) بـ 200 OK — دي مش الملف */
      if (isHtmlContentType(ct)) {
        htmlBlocked = true
        /* (Z-41) الملفات الكبيرة: صفحة التأكيد فيها فورم uuid مخفي — بنفكّه
           ونطلّب الملف بنفس النداء بدل ما نفشل. صفحة تسجيل الدخول مفيهاش uuid
           فبنكمل للمرشح اللي بعده/الرسالة الواضحة. */
        if (ci < candidates.length - 1 || extractDriveFileId(url)) {
          try {
            var htmlText = ''
            if (upstream.body) {
              var cloned = upstream.clone()
              var ab = await cloned.arrayBuffer()
              if (ab && ab.byteLength <= 512 * 1024) htmlText = new TextDecoder('utf-8', { fatal: false }).decode(ab)
            }
            var confUrl = htmlText ? buildConfirmedDriveUrl(htmlText, extractDriveFileId(url) || '') : null
            if (confUrl) {
              var upstream2: Response | null = null
              try {
                upstream2 = await fetch(confUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (ZicolaBooksProxy)',
                    'Accept': '*/*',
                  },
                  redirect: 'follow',
                  cache: 'no-store',
                })
              } catch (eC) { upstream2 = null }
              if (upstream2 && upstream2.ok && upstream2.body) {
                var ct2 = String(upstream2.headers.get('content-type') || '')
                if (!isHtmlContentType(ct2)) {
                  var len2 = parseInt(String(upstream2.headers.get('content-length') || ''), 10)
                  if (!isNaN(len2) && len2 > MAX_BYTES) {
                    return NextResponse.json({ error: 'الملف أكبر من الحد المسموح (250MB)' }, { status: 413 })
                  }
                  var fname2 = filenameFromDisposition(String(upstream2.headers.get('content-disposition') || ''))
                  return streamPdfResponse(upstream2, ct2, len2, fname2, asDownload)
                }
              }
            }
          } catch (eConfirm) { /* الصمت — نكمل السلوك القديم */ }
        }
        continue
      }
      var len = parseInt(String(upstream.headers.get('content-length') || ''), 10)
      if (!isNaN(len) && len > MAX_BYTES) {
        return NextResponse.json({ error: 'الملف أكبر من الحد المسموح (250MB)' }, { status: 413 })
      }
      var fname = filenameFromDisposition(String(upstream.headers.get('content-disposition') || ''))
      return streamPdfResponse(upstream, ct, len, fname, asDownload)
    }

    if (htmlBlocked) {
      return NextResponse.json({ error: 'جوجل درايف رجّع صفحة مش الملف — اتأكد إن مشاركة الملف «أي شخص لديه الرابط» وحاول تاني' }, { status: 422 })
    }
    return NextResponse.json({ error: 'مقدرتش أجيب الملف من اللينك' + (lastStatus ? ' (' + lastStatus + ')' : '') }, { status: 502 })
  } catch (e: any) {
    console.error('[books-proxy] error:', e)
    return NextResponse.json({ error: 'فشل تحميل الملف من اللينك' }, { status: 500 })
  }
}

/* (Z-41) الرد الموحد: PDF inline في المتصفح (يفتح فورًا) أو attachment مع dl=1
   + X-Proxy-Filename بالاسم الحقيقي (URL-encoded عشان الهيدر ASCII بس) */
function streamPdfResponse(upstream: Response, ct: string, len: number, fname: string, asDownload: boolean) {
  var headers = new Headers()
  headers.set('Content-Type', ct || 'application/pdf')
  if (!isNaN(len) && len > 0) headers.set('Content-Length', String(len))
  headers.set('Cache-Control', 'no-store')
  var safeName = String(fname || '').replace(/[\\/:*?"<>|\r\n]/g, ' ').trim() || 'book.pdf'
  headers.set('Content-Disposition', (asDownload ? 'attachment' : 'inline') + '; filename*=UTF-8\'\'' + encodeURIComponent(safeName))
  headers.set('X-Proxy-Filename', encodeURIComponent(safeName))
  return new NextResponse(upstream.body, { status: 200, headers: headers })
}
