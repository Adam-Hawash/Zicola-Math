/* (ر8 — نشر Cloudflare Workers)
   Next 16.3 بيولّد لودر بيحمّل الـ instrumentation hook بـ require()
   ديناميكي مبني على مسار وقت التشغيل — وworkerd (runtime بتاع
   كلاود فلير) ما بيدعمش الـ require الديناميكي فبينهار البوت برسالة
   «Dynamic require of /.next/server/instrumentation.js is not supported».
   patch بتاع OpenNext بيتعامل مع الحالتين: يا إما استيراد ثابت للملف
   المبني يا إما null لما مفيش hook — والحالة الفاضية هي اللي كانت بتقع.
   وجود الملف ده (register فاضي — بدون أي سلوك) بيخلي Next يبني
   server/instrumentation.js فعليًا فالـ patch يستورده استيراد ثابت
   سليم والمنصة بتشتغل عادي. */
export async function register() {}
