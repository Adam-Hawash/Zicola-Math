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
export default {
    async fetch(request, env, ctx) {
        return __ffFetch(request, env, ctx);
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
console.log('[patch-worker] ✓ بوابة أول تحميل لكل مسار (ر14) + تسجيل المراحل اتطبقوا على worker.js')
