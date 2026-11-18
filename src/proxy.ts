// ============================================================
// (ر14) proxy.ts — middleware بتاع Next.js 16 (الاسم الجديد بدل middleware.ts)
// ============================================================
// المشكلة الحية من المستر: فتح zicola-in-math.com بـ http:// مباشرة
// بيقول «Your connection to this site is not secure» وكلمة المرور
// بتتبعت مشفرة أصلاً — لوجو تسجيل الدخول على http خطير ومخيف للمستر.
// الحل: أي طلب http بيتحول 308 (permanent — بيحافظ على الميثود) إلى
// https — Cloudflare بيبعت x-forwarded-proto في كل طلب فبنشوفه هنا.
// ملاحظة للمستر: برضه ينصح يفعّل «Always Use HTTPS» من لوحة Cloudflare
// (SSL/TLS → Edge Certificates) كطبقة تانية — بس ده مش ضروري بعد ر14.
// ============================================================
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  var proto = String(request.headers.get('x-forwarded-proto') || '')
  /* x-forwarded-proto ممكن يجي «http,http» ورا سلسلة بروكسيات — نتحقق
     إنه http من غير https في أي حتة */
  if (proto && proto.indexOf('https') === -1 && proto.indexOf('http') !== -1) {
    var url = request.nextUrl.clone()
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }
  return NextResponse.next()
}

export var config = {
  /* الصفحات بس — الـ APIs والملفات الثابتة متتلمسش (بروتوكولها بيمشي
     مع بروتوكول الصفحة نفسها) */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|images|files|icons|manifest).*)'],
}
