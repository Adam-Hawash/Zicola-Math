/* ============================================================
   (ر27) ريتراي شفاف للنداءات الفاشلة لحظيًا — شكوى المستر الحية:
   «كل شويه تفتح وتقفل تفتح وتقفل» + «دي كده تعطل ناس كتير».
   التشخيص الحي أثبت إن المنصة سليمة (كل المسارات 200) لكن نقاط
   الضعف اللحظية في شبكة العميل/الإيدج بتسقط نداء واحد فقسم كامل
   يختفي أو البيانات تروح. الحل: 3 محاولات بفواصل قصيرة متزايدة
   (350/700ms) + إعادة على 5xx اللحظي — الفشل اللحظي بيتصلح لوحده
   والمستخدم ما بيحسش بحاجة.
   ============================================================ */
export async function fetchWithRetry(url: string, init?: RequestInit, attempts: number = 3): Promise<Response> {
  var lastErr: unknown = null
  for (var attempt = 0; attempt < attempts; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(function (r) { setTimeout(r, 350 * attempt) })
      }
      var res = await fetch(url, init)
      /* 5xx لحظي من الإيدج → محاولة تانية بدل ما القسم يقع */
      if (res && res.status >= 500 && res.status <= 599 && attempt < attempts - 1) {
        lastErr = new Error('HTTP ' + res.status)
        continue
      }
      return res
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('فشل النداء بعد ' + attempts + ' محاولات')
}
