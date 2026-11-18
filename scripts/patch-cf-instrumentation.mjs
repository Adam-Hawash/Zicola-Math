// ============================================================
// (ر8 — نشر Cloudflare Workers) patch-cf-instrumentation.mjs
// ============================================================
// المشكلة: Next 16.3.1 بيولّد getInstrumentationModule بـ require()
// ديناميكي (path.join(dir, distDir, "server", `instrumentation.js`))
// — وesbuild ما بيقدرش يحلّه فيبنيه شيم بيرمي «Dynamic require of
// "/.next/server/instrumentation.js" is not supported» وقت التشغيل
// في workerd → كل الطلبات بترجع 500 «Server failed to respond».
//
// patch بتاع @opennextjs/cloudflare (patchInstrumentation) بيمسك
// الحالة دي بس AST rule بتاعه (patch-instrumentation-next15-4)
// متوقع شكل كود أقدم — شكل 16.3.1 (الأسايمنت جوه return جوه try)
// ما بيتطابقش فالـ require بيفضل موجود.
//
// الحل هنا: بعد ما opennextjs-cloudflare build يخلص، بنبدّل الـ
// require الديناميكي بـ null جوه نفس الـ try/catch — المنصة ملهاش
// instrumentation hook حقيقي (src/instrumentation.ts فاضي بالفعل)
// فإرجاع null = نفس سلوك edge runtime بالظبط، بدون أي سلوك مفقود.
//
// بيتنادى من wrangler.jsonc بعد أمر البناء:
//   npx opennextjs-cloudflare build && node scripts/patch-cf-instrumentation.mjs
// ============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const HANDLER = '.open-next/server-functions/default/handler.mjs'

if (!existsSync(HANDLER)) {
        console.log('[patch-cf] handler.mjs مش موجود — بناء OpenNext شغال؟')
        process.exit(0)
}

let content = readFileSync(HANDLER, 'utf8')
const before = content

/* الاستيراد الديناميكي: await require(<pathExpr>.join(...`...${INSTRUMENTATION_HOOK_FILENAME}.js`...))
   بنبدّله بوعد بيحل لـ module مفيهوش حاجة (علم __esModule + register null) —
   مش null خام عشان interopDefault بتاعة Next بتقرا خصائص من الناتج،
   والاستدعاء أصلاً جوه try/catch وبيرجع null-سيف (n?.register) */
content = content.replace(
        /await require\([^;]*?INSTRUMENTATION_HOOK_FILENAME[^;]*?\)\)/g,
        'await Promise.resolve({ __esModule: true, register: null })'
)

if (content === before) {
        console.log('[patch-cf] مفيش require ديناميكي للـ instrumentation (يمكن اتصلّح في نسخة أحدث من الأدبتور) — مفيش تغيير')
} else {
        writeFileSync(HANDLER, content)
        console.log('[patch-cf] ✓ instrumentation dynamic require → null (workerd-safe)')
}
