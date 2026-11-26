// ============================================================
// (ر14) proxy.ts — middleware بتاع Next.js 16 (الاسم الجديد بدل middleware.ts)
// ============================================================
// المشكلة الحية من المستر: فتح zicola-in-math.com بـ http:// مباشرة
// بيقول «Your connection to this site is not secure» وكلمة المرور
// بتتبعت مشفرة أصلاً — لوجو تسجيل الدخول على http خطير ومخيف للمستر.
// الحل: أي طلب http بيتحول 308 (permanent — بيحافظ على الميثود) إلى
// https — Cloudflare بيبعت x-forwarded-proto في كل طلب فبنشوفه هنا.
// (ر24) إضافة HSTS: المتصفح بيتعلم من أول زيارة https وبيعمل ترقية
// داخلية فورية لأي طلب http بعدها — فشعار «Not secure» اللي كان بيظهر
// وقت التحميل على http بيختفي نهائيًا بعد أول دخول سليم.
// ملاحظة للمستر: برضه ينصح يفعّل «Always Use HTTPS» من لوحة Cloudflare
// (SSL/TLS → Edge Certificates) كطبقة تانية — بس ده مش ضروري بعد ر14.
// ============================================================
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

var HSTS = 'max-age=31536000'

/* (ر26) CSP upgrade-insecure-requests — أي مورد فرعي http:// جاي من
   الداتا (روابط فيديو/صور اتنسخت بـ http) بيرقى https تلقائيًا في
   المتصفح من غير ما يتمنع — نهاية نهائية لأي شعار «Not (fully)
   secure» وحالات blocked mixed content في الكونسول حتى لو رابط
   http اتحفظ في قاعدة البيانات نفسها. */
var CSP_UPGRADE = 'upgrade-insecure-requests'

export function proxy(request: NextRequest) {
  var proto = String(request.headers.get('x-forwarded-proto') || '')
  /* (وN8) بوابة داخلية صريحة للـ API والملفات الثابتة — نية الـ matcher
     الأصلية بالحرف: الـ API عمره ما يتلمس (بروتوكوله بيمشي مع بروتوكول
     الصفحة نفسها) — ومفيد كمان لو بيئة استضافة اتجاهلت الـ matcher */
  var p = String(request.nextUrl.pathname || '')
  if (
    p === '/api' || p.indexOf('/api/') === 0 ||
    p.indexOf('/_next/') === 0 ||
    p === '/favicon.ico' || p === '/sw.js' || p === '/manifest.json' ||
    p.indexOf('/images/') === 0 || p.indexOf('/files/') === 0 || p.indexOf('/icons/') === 0
  ) {
    return NextResponse.next()
  }
  /* x-forwarded-proto ممكن يجي «http,http» ورا سلسلة بروكسيات — نتحقق
     إنه http من غير https في أي حتة */
  if (proto && proto.indexOf('https') === -1 && proto.indexOf('http') !== -1) {
    var url = request.nextUrl.clone()
    url.protocol = 'https:'
    var redirect = NextResponse.redirect(url, 308)
    redirect.headers.set('Strict-Transport-Security', HSTS)
    return redirect
  }
  var response = NextResponse.next()
  /* HSTS على كل رد https — بعد أول زيارة المتصفح بيرقي http لوحده بلا وميض «Not secure» */
  response.headers.set('Strict-Transport-Security', HSTS)
  /* (ر26) ترقية أي موارد http إلى https — حماية من المحتوى المختلط
     مهما كان مصدر الرابط (قاعدة البيانات/لوحة الأدمن) */
  response.headers.set('Content-Security-Policy', CSP_UPGRADE)
  return response
}

export var config = {
  /* الصفحات بس — الـ APIs والملفات الثابتة متتلمسش (بروتوكولها بيمشي
     مع بروتوكول الصفحة نفسها) */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|images|files|icons|manifest).*)'],
}
