// ============================================================
// (ر13 — نشر Cloudflare Workers) patch-cf-worker-entry.mjs
// ============================================================
// العطل المُثبت حيًا (ر13) بالتشخيص المرحلي على نفس runtime الإنتاج
// (workerd عبر wrangler dev):
//  1) نداءات متزامنة على مسارات أول مرة تُطلب في العزل (أو أول ما
//     توصل طبقة الداتابيز مع بعضها) → سباق في التحميل الكسور/طبقة
//     العمولة → بعض السلاسل تتقطع → workerd يلغي النداء فورًا برسوم
//     «hung and would never generate a response» = في الإنتاج
//     «error code: 1101» بجسم مش JSON → «السيرفر رجّع كود 500» في
//     لوحة الأدمن + فشل إضافة الفيديو + أقسام ناقصة أول تحميل بعد سكون.
//  2) الدليل الحاسم: workerd يقول حرفيًا «This promise was created by
//     a request that has since ended, so it can never settle» — أي
//     تنسيق بين الطلبات عبر promises عابرة للحدود ممنوع (سلاسل
//     الانتظار العابرة = نفس نوع العطل — اتجرب واتأكد).
//
// الإصلاح في worker.js — بوابة أول تحميل **مزامنة بالكامل**:
//  - علم Boolean مشترك + polling بمؤقتات الطلب نفسه (3ms): النداء
//    المنتظر فاعل وعنده أحداث pending فما بيتلغاش أبدًا.
//  - أول نداء لكل مسار بارد بياخد القفل وبيطير منفرد (الاستيراد
//    الكسور + أول عمليات الداتابيز لوحدهم)، والمسارات الباردة التانية
//    بتستنى بالـ polling. بعد أول نجاح المسار بيتسجل دافي للأبد في
//    العزل (pass-through صفر تكلفة).
//  - المسار بيتسجل دافي بس لو نداءه الأول **نجح** — الفاشل بيفضل بارد.
//  - سرقة القفل بعد 30 ثانية لو صاحبه اتلغى (ضمان ضد حصار دائم).
//  والطبقة المقابلة في db.ts (قفل الداتابيز المزامن) بتغطي سباقات
//  عمليات الداتابيز على المسارات الدافية — الاتنين معًا بيقطعوا كل
//  أنواع السباق المُثبتة.
// الباتش بيتنفذ بعد كل build:cf (worker.js بيتولد من جديد كل مرة)
// وبيفشل بصوت عالي لو الشكل اتغير في نسخة أدبتير أحدث.
// ============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const WORKER = '.open-next/worker.js'

if (!existsSync(WORKER)) {
        console.error('[patch-worker] worker.js مش موجود — بناء OpenNext ما اتمشش؟')
        process.exit(1)
}

let content = readFileSync(WORKER, 'utf8')

const OPEN_ANCHOR = `export default {
    async fetch(request, env, ctx) {
        return runWithCloudflareRequestContext(request, env, ctx, async () => {`

const CLOSE_ANCHOR = `        });
    },
};`

const OPEN_REPLACEMENT = `/* (ر13 — بوابة أول تحميل المزامنة ضد سباق التحميل الكسور)
   (ر14) القفل بقى **لكل مسار** بدل قفل عالمي واحد — كانت بتسلسل كل المسارات
   الباردة ورا بعض = بطء التحميل الأول. دلوقتي المسارات المختلفة بتشتغل بالتوازي
   والمسار الواحد بس بيتسلسل على أول تحميل (نفس الحماية لسباق الاستيراد) */
const __ffGate = { locks: new Map(), pathWarm: new Set() };
async function __originalFetch(request, env, ctx) {
        return runWithCloudflareRequestContext(request, env, ctx, async () => {`

const CLOSE_REPLACEMENT = `        });
}
async function __ffFetch(request, env, ctx) {
        var __ffPath = new URL(request.url).pathname;
        if (__ffGate.pathWarm.has(__ffPath)) return __originalFetch(request, env, ctx);
        /* (ر14) قفل لكل مسار — أخذ القفل بالـ polling المزامن، النداء المنتظر فاعل (timers) فما بيتلغاش */
        var __ffLock = __ffGate.locks.get(__ffPath);
        if (!__ffLock) { __ffLock = { busy: false, since: 0 }; __ffGate.locks.set(__ffPath, __ffLock); }
        for (;;) {
            if (!__ffLock.busy || Date.now() - __ffLock.since > 30000) {
                __ffLock.busy = true;
                __ffLock.since = Date.now();
                break;
            }
            await new Promise(function (r) { setTimeout(r, 3) });
        }
        try {
            if (__ffGate.pathWarm.has(__ffPath)) return await __originalFetch(request, env, ctx);
            var __ffR = await __originalFetch(request, env, ctx);
            __ffGate.pathWarm.add(__ffPath);
            return __ffR;
        } finally {
            __ffLock.busy = false;
        }
}
/* (ر27 — طبقة كاش الإيدج ضد «تفتح وتقفل») شكوى المستر الحية بعد ر26:
   «كل شويه تفتح وتقفل تفتح وتقفل... دي كده تعطل ناس كتير» — الفحص الحي
   بعد ر26 أثبت إن الإحماء بالكرون لوحده مش كافي: TTFB لسه بيتذبذب
   0.48-2.48s لأن النداءات بتقع على isolate بارد أول ما TTL يخلص أو
   الراوتر يبدّل isolate. الحل الجذري: الردود العامة المتكررة (الرئيسية
   HTML + APIs اللند) تتكاش على إيدج كلاود فلير نفسه (Cache API —
   شغالة من غير أي إعداد في اللوحة) — أغلب طلبات الطلاب بترد في
   ميلي ثواني من الإيدج من غير ما توصل الـ isolate أصلًا، ودمغة
   انفجار (طلاب كتير بيفتحوا في نفس اللحظة) بتتقفل على نداء أصل واحد.
   قواعد الأمان الصارمة:
   - GET بس + من غير كوكيز (الزوار فقط) — المسجلين بياخدوا داتا حية
   - مسارات عامة بس (مفيش /admin ولا أي مسار شخصي)
   - التخزين بـ s-maxage=60 للإيدج + max-age=0 must-revalidate
     للمتصفح — المتصفح بيعيد التحقق كل مرة فالبورج بيظهر فورًا
   - بورج فوري لكل مفاتيح الكاش أول ما أي تعديل محتوى ينجح
     (POST/PUT/DELETE على /api/admin/* أو config/gallery/videos/
     challenges/daily-info/site-config/social-links/upload) — تغييرات
     الأدمن بتظهر فورًا زي و103 بالحرف
   - seen الطالب (daily-info/seen) مستثنى من البورج عشان ميسحقش
     الكاش مع كل طالب بيفتح الحبة
   - كرون keepwarm بيتجاوز الكاش عشان يسخّن الـ handler الحقيقي
   - X-FF-Cache: HIT/MISS للفحص الحي المباشر */
var __ffCachePaths = { '/': 1, '/api/config': 1, '/api/daily-info': 1, '/api/gallery': 1, '/api/stats': 1, '/api/videos': 1, '/api/challenges/active': 1 };
var __ffBustParams = { sw: 1, nocache: 1, ts: 1, cb: 1, r: 1, t: 1, _: 1, v: 1, cache: 1 };
var __ffMutatingPrefixes = ['/api/admin/', '/api/config', '/api/gallery', '/api/videos', '/api/challenges', '/api/daily-info', '/api/site-config', '/api/social-links', '/api/upload'];
var __ffPurgeExcluded = { '/api/daily-info/seen': 1 };
function __ffCacheKeyUrl(request) {
    var u = new URL(request.url);
    var qs = (u.search || '').replace(/^\?/, '').split('&').filter(Boolean)
        .map(function (kv) { return kv.split('='); })
        .filter(function (p) { return p[0] && !__ffBustParams[p[0]]; })
        .sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); })
        .map(function (p) { return p[0] + '=' + p.slice(1).join('='); })
        .join('&');
    return u.origin + u.pathname + (qs ? '?' + qs : '');
}
function __ffIsMutating(path) {
    if (__ffPurgeExcluded[path]) return false;
    for (var i = 0; i < __ffMutatingPrefixes.length; i++) {
        if (path === __ffMutatingPrefixes[i] || path.indexOf(__ffMutatingPrefixes[i]) === 0) return true;
    }
    return false;
}
async function __ffEdgeCacheFetch(request, env, ctx) {
    try {
        var method = ((request && request.method) || 'GET').toUpperCase();
        var u = new URL(request.url);
        /* كرون keepwarm (keepwarm.internal) يعدي على طول عشان يسخّن الـ handler الحقيقي مش الكاش */
        if (u.hostname === 'keepwarm.internal') return __ffFetch(request, env, ctx);
        var cacheApi = (typeof caches !== 'undefined' && caches && caches.default) ? caches.default : null;
        if (method !== 'GET' || !cacheApi || request.headers.get('cookie')) {
            var resp0 = await __ffFetch(request, env, ctx);
            /* بورج فوري بعد أي تعديل محتوى ناجح — تغييرات الأدمن تظهر فورًا */
            if (method !== 'GET' && cacheApi && resp0 && resp0.status >= 200 && resp0.status < 300 && __ffIsMutating(u.pathname)) {
                try {
                    var __ffPurgeKeys = ['/', '/api/config', '/api/daily-info', '/api/gallery', '/api/stats', '/api/videos', '/api/videos?pageSize=50', '/api/challenges/active'];
                    for (var i2 = 0; i2 < __ffPurgeKeys.length; i2++) {
                        var pr = cacheApi.delete(new Request(u.origin + __ffPurgeKeys[i2], { method: 'GET' }));
                        if (ctx && ctx.waitUntil) ctx.waitUntil(pr);
                    }
                } catch (eDel) {}
            }
            return resp0;
        }
        var path = u.pathname;
        if (!__ffCachePaths[path]) return __ffFetch(request, env, ctx);
        var keyUrl = __ffCacheKeyUrl(request);
        try {
            var hit = await cacheApi.match(new Request(keyUrl, { method: 'GET' }));
            if (hit) {
                var hb = await hit.arrayBuffer();
                var hh = new Headers(hit.headers);
                hh.set('X-FF-Cache', 'HIT');
                return new Response(hb, { status: hit.status, statusText: hit.statusText, headers: hh });
            }
        } catch (eM) {}
        var resp = await __ffFetch(request, env, ctx);
        try {
            if (resp && resp.status === 200 && !resp.headers.get('set-cookie')) {
                var body = await resp.arrayBuffer();
                var h = new Headers(resp.headers);
                h.set('Cache-Control', 'public, s-maxage=60, max-age=0, must-revalidate');
                h.delete('set-cookie');
                h.set('X-FF-Cache', 'MISS');
                var cached = new Response(body.slice(0), { status: resp.status, statusText: resp.statusText, headers: h });
                var putP = cacheApi.put(new Request(keyUrl, { method: 'GET' }), cached);
                if (ctx && ctx.waitUntil) ctx.waitUntil(putP);
                return new Response(body, { status: resp.status, statusText: resp.statusText, headers: h });
            }
        } catch (eP) {}
        return resp;
    } catch (eC) {
        return __ffFetch(request, env, ctx);
    }
}
export default {
    async fetch(request, env, ctx) {
        return __ffEdgeCacheFetch(request, env, ctx);
    },
    /* (ر26) مُدقّق دوري keep-warm — شكوى المستر الحية: «كل ما أدخل على المنصة
       بتاخد وقت كبير جداً عقبال ما تشتغل وتحمل» — الإثبات الحي على الإنتاج
       بعد ر25: النداءات بتتناوب بين isolate دافي (TTFB 0.068s) وبارد
       (TTFB 1.2-2.3s على / وكل APIs اللند) — يعني نص زيارات المستر بتقع
       على isolate بارد بياخد من الأول: تفريغ الباندل + استيراد الـ handler
       + إنشاء عميل Turso + أرزي الجداول. المنصة كلها force-dynamic (و103
       عشان تغييرات الأدمن تظهر فورا) فمفيش كاش HTML يلجأ له.
       الحل: cron كل دقيقتين بيندّي على المنصة نفسها عبر ربط
       WORKER_SELF_REFERENCE على مسارات اللند كلها بالترتيب: SSR الرئيسية
       (بيسخّن استيراد الـ handler + عميل الداتابيز) وبعدين كل APIs اللي
       الصفحة الرئيسية بتناديلها فعلًا (config/gallery/stats/videos/challenges
       + daily-info بتاعة الحبة) وآخر حاجة health (أتقلهم). فأي زيارة
       حقيقية بتجي على isolate دافي بيرد في جزء من الثانية — والـ cron نفسه
       ملوف بعبارات try/catch فبيفشل بصمت ومش هيضيف أخطاء في اللوحة. */
    async scheduled(event, env, ctx) {
        try {
            var __ffSelf = env && env.WORKER_SELF_REFERENCE;
            if (!__ffSelf) return;
            var __ffPaths = [
                '/',
                '/api/daily-info',
                '/api/config',
                '/api/gallery',
                '/api/stats',
                '/api/videos?pageSize=50',
                '/api/challenges/active',
                '/api/health',
            ];
            for (var __ffI = 0; __ffI < __ffPaths.length; __ffI++) {
                try {
                    await __ffSelf.fetch(new Request('https://keepwarm.internal' + __ffPaths[__ffI]));
                } catch (__ffE) {}
            }
        } catch (__ffE2) {}
    },
};`

/* (ر13-تشخيص) تسجيل مراحل الطلب — بيكشف فين النداء المعلّق بيوقف
   في اللوغات (wrangler tail) — سطور قصيرة رخيصة وبلاش أي I/O */
const STAGE_INSTRUMENT = [
        {
                find: `const reqOrResp = await middlewareHandler(request, env, ctx);`,
                replace: `const __ffT = Date.now(); console.log('[ff:mw:begin]', request.url, 'warm=' + __ffGate.pathWarm.has(new URL(request.url).pathname)); const reqOrResp = await middlewareHandler(request, env, ctx); console.log('[ff:mw:end]', request.url, Date.now() - __ffT + 'ms');`,
        },
        {
                find: `const { handler } = await import("./server-functions/default/handler.mjs");`,
                replace: `console.log('[ff:import:begin]', request.url); const { handler } = await import("./server-functions/default/handler.mjs"); console.log('[ff:import:end]', request.url);`,
        },
        {
                find: `return handler(reqOrResp, env, ctx, request.signal);`,
                replace: `console.log('[ff:handler:begin]', request.url); const __ffR = await handler(reqOrResp, env, ctx, request.signal); console.log('[ff:handler:end]', request.url); return __ffR;`,
        },
]

if (content.indexOf('__ffGate') !== -1) {
        console.log('[patch-worker] الطبقات متطبقة خلاص — مفيش تغيير')
        process.exit(0)
}

if (content.indexOf(OPEN_ANCHOR) === -1) {
        console.error('[patch-worker] فشل: شكل worker.js اتغير — anchor الافتتاح مش موجود. عدّل الباتش على الشكل الجديد بدل ما تتجاهل العطل!')
        process.exit(1)
}
if (content.indexOf(CLOSE_ANCHOR) === -1) {
        console.error('[patch-worker] فشل: anchor الختام مش موجود — عدّل الباتش بدل ما تتجاهل العطل!')
        process.exit(1)
}

content = content.replace(OPEN_ANCHOR, OPEN_REPLACEMENT)
content = content.replace(CLOSE_ANCHOR, CLOSE_REPLACEMENT)

/* تطبيق تسجيل المراحل — أي anchor مش موجود بيفشل بصوت عالي */
for (const step of STAGE_INSTRUMENT) {
        if (content.indexOf(step.find) === -1) {
                console.error('[patch-worker] فشل: anchor مرحلة التشخيص مش موجود: ' + step.find.slice(0, 60))
                process.exit(1)
        }
        content = content.replace(step.find, step.replace)
}

writeFileSync(WORKER, content)
console.log('[patch-worker] ✓ بوابة أول تحميل لكل مسار (ر14) + كاش الإيدج والبورج الفوري (ر27) + تسجيل المراحل اتطبقوا على worker.js')
