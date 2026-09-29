// @ts-nocheck
// ============================================================
// (تسريع المنصة — و112) طلب المستر: «شاشة التحميل تحمل البيانات جوه
// المنصه ولما المنصه تفتح تكون البيانات كلها فيها جاهزه ما تاخدش وقت»
// ============================================================
// المشكلة: بعد نجاح تسجيل الدخول، فسحة الطالب بتفتح وح десят من الـ
// chunk بتاعها الكبير ينزل — وبعدها بس كانت بتبدأ 10 طلبات API — يعني
// الطالب بيستنى مرتين ورا بعض (تحميل الكود + تحميل البيانات) كل واحدة
// 1-3 ثواني على شبكة الموبايل.
// الحل: أول ما الدخول ينجح بنبدأ فورًا تحميل كل طلبات البيانات العشرة
// بالتوازي. ولما الفسحة تفتح تلاقي البيانات واخدة طريقها (وغالبًا وصلت
// خلاص) فبتظهر جاهزة فورًا.
// - الكاش استهلاك-واحدة (take): أول فتح للفسحة ياكل الكاش، وأي دخول
//   جديد بعده يجيب بيانات طازة زي ما كان بالظبط.
// - نفس روابط ونفس ترتيب Promise.all الأصلي حرفيًا عشان مفيش أي فرق
//   في شكل البيانات اللي الفسحة بتقراها.
// ============================================================

var bundleCache: { key: string; promise: Promise<any[]> } | null = null

export function buildPortalUrls(grade: string, studentId: string): string[] {
  var g = encodeURIComponent(String(grade || ''))
  var sid = String(studentId || '')
  return [
    '/api/videos?grade=' + g + '&pageSize=100',
    '/api/homework?grade=' + g + '&pageSize=50&studentId=' + encodeURIComponent(sid),
    '/api/exams?grade=' + g + '&pageSize=50&studentId=' + encodeURIComponent(sid),
    '/api/announcements?grade=' + g + '&pageSize=10',
    '/api/exam-results?studentId=' + sid,
    '/api/activities?studentId=' + sid + '&action=watched_video&pageSize=200',
    '/api/payments?studentId=' + sid + '&status=approved&pageSize=200',
    '/api/video-access?studentId=' + sid,
    '/api/video-progress?studentId=' + sid,
    '/api/homework-results?studentId=' + sid,
  ]
}

/* نفس Promise.all بتاع الفسحة بالظبط — مصدر واحد للحقيقة */
export function fetchPortalBundle(grade: string, studentId: string): Promise<any[]> {
  var key = String(grade || '') + '|' + String(studentId || '')
  if (bundleCache && bundleCache.key === key) return bundleCache.promise
  var urls = buildPortalUrls(grade, studentId)
  var promise = Promise.all([
    fetch(urls[0]).then(function (r) { return r.json() }),
    fetch(urls[1]).then(function (r) { return r.json() }),
    fetch(urls[2]).then(function (r) { return r.json() }),
    fetch(urls[3]).then(function (r) { return r.json() }),
    fetch(urls[4]).then(function (r) { return r.ok ? r.json() : { results: [], _fetchFailed: true } }).catch(function () { return { results: [], _fetchFailed: true } }),
    fetch(urls[5]).then(function (r) { return r.json() }),
    fetch(urls[6]).then(function (r) { return r.json() }),
    fetch(urls[7]).then(function (r) { return r.json() }).catch(function () { return { accesses: [] } }),
    fetch(urls[8]).then(function (r) { return r.json() }).catch(function () { return { progress: [] } }),
    fetch(urls[9]).then(function (r) { return r.json() }).catch(function () { return { results: [] } }),
  ]).catch(function () {
    /* فشل الشبكة كله — رجّع حاوية فاضية عشان الفسحة تفتح عادي وتعيد المحاولة بطريقها */
    return [{}, {}, {}, {}, { results: [], _fetchFailed: true }, {}, {}, { accesses: [] }, { progress: [] }, { results: [] }]
  })
  bundleCache = { key: key, promise: promise }
  return promise
}

/* نسخة من غير كاش — الفسحة تستخدمها لو مفيش تحميل مسبق (ريفرش/فتح مباشر)
   عشان الدخول الجاي بعد الخروج يجيب بيانات طازة دايمًا */
export function fetchPortalBundleOnce(grade: string, studentId: string): Promise<any[]> {
  var urls = buildPortalUrls(grade, studentId)
  return Promise.all([
    fetch(urls[0]).then(function (r) { return r.json() }),
    fetch(urls[1]).then(function (r) { return r.json() }),
    fetch(urls[2]).then(function (r) { return r.json() }),
    fetch(urls[3]).then(function (r) { return r.json() }),
    fetch(urls[4]).then(function (r) { return r.ok ? r.json() : { results: [], _fetchFailed: true } }).catch(function () { return { results: [], _fetchFailed: true } }),
    fetch(urls[5]).then(function (r) { return r.json() }),
    fetch(urls[6]).then(function (r) { return r.json() }),
    fetch(urls[7]).then(function (r) { return r.json() }).catch(function () { return { accesses: [] } }),
    fetch(urls[8]).then(function (r) { return r.json() }).catch(function () { return { progress: [] } }),
    fetch(urls[9]).then(function (r) { return r.json() }).catch(function () { return { results: [] } }),
  ]).catch(function () {
    return [{}, {}, {}, {}, { results: [], _fetchFailed: true }, {}, {}, { accesses: [] }, { progress: [] }, { results: [] }]
  })
}

/* عند نجاح الدخول — إشعال التحميل من غير انتظار (fire-and-forget) */
export function startPortalBundle(grade: string, studentId: string): void {
  try { fetchPortalBundle(grade, studentId) } catch (e) {}
}

/* أول فتح للفسحة — ياخد الكاش (لو موجود) ويمسحه عشان الدخول الجاي يبقى طازة */
export function takePortalBundle(grade: string, studentId: string): Promise<any[]> | null {
  var key = String(grade || '') + '|' + String(studentId || '')
  if (bundleCache && bundleCache.key === key) {
    var p = bundleCache.promise
    bundleCache = null
    return p
  }
  return null
}
