// @ts-nocheck
// ============================================================
// (تسريع المنصة — و105) كاش SiteConfig في الذاكرة
// ============================================================
// المشكلة: الكونفيج (143 مفتاح) بيتقري من قاعدة Turso البعيدة في
// **كل طلب** — الراوت لايوت (force-dynamic) + /api/config + /
// api/site-config — وكل قراءة = roundtrip كامل على الشبكة (0.5-1.5 ثانية).
// الحل: كاش في الذاكرة بصلاحية قصيرة (30 ثانية) + إبطال فوري عند أي
// كتابة من الأدمن (invalidateSiteConfigCache) — فالتعديلات بتظهر لحظيًا
// زي ما هي، والقرايات بتبقى فورية بعد أول تحميل في نفس العزل.
// - dedupe الطلبات المتوازية (inflight) عشان ما يحصلش stampede عند
//   بداية العزل البارد.
// - فشل القاعدة يرمي الخطأ طبيعي (كل نادي بيتعامل معاه بـ catch زي ما هو).
// ============================================================

import { db } from '@/lib/db'

var TTL_MS = 30 * 1000
var cache: { map: Record<string, string> | null; at: number } = { map: null, at: 0 }
var inflight: Promise<Record<string, string>> | null = null

async function loadFromDb(): Promise<Record<string, string>> {
  var configs = await db.siteConfig.findMany()
  var map: Record<string, string> = {}
  for (var i = 0; i < configs.length; i++) {
    map[configs[i].key] = configs[i].value
  }
  return map
}

/** قراءة الكونفيج الخام (قيم الداتابيز فقط) — من الكاش لو صالح */
export async function getSiteConfigRaw(): Promise<Record<string, string>> {
  var now = Date.now()
  if (cache.map && now - cache.at < TTL_MS) return cache.map
  if (inflight) return inflight
  inflight = loadFromDb()
    .then(function (map) {
      cache = { map: map, at: Date.now() }
      inflight = null
      return map
    })
    .catch(function (err) {
      inflight = null
      throw err
    })
  return inflight
}

/** إبطال الكاش — تتنادى بعد أي كتابة على SiteConfig من أي راوت */
export function invalidateSiteConfigCache() {
  cache = { map: null, at: 0 }
}
