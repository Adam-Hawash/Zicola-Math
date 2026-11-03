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
// ملاحظات أمان: http/https بس + ممنوع localhost/private IPs (SSRF) +
// حجم أقصى 250MB — والاستجابة بتتحول stream زي ما هي.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { directDownloadCandidates, isHtmlContentType } from '@/lib/drive-url'

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

export async function GET(request: NextRequest) {
  try {
    var url = new URL(request.url).searchParams.get('url') || ''
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
      /* (Z-40e) جوجل بترجّع صفحة HTML (عارض/تأكيد فيروسات) بـ 200 OK — دي مش الملف، نجرب المرشح اللي بعده */
      if (isHtmlContentType(ct)) { htmlBlocked = true; continue }
      var len = parseInt(String(upstream.headers.get('content-length') || ''), 10)
      if (!isNaN(len) && len > MAX_BYTES) {
        return NextResponse.json({ error: 'الملف أكبر من الحد المسموح (250MB)' }, { status: 413 })
      }
      var headers = new Headers()
      headers.set('Content-Type', ct || 'application/pdf')
      if (!isNaN(len)) headers.set('Content-Length', String(len))
      headers.set('Cache-Control', 'no-store')
      return new NextResponse(upstream.body, { status: 200, headers: headers })
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
