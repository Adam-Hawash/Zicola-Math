// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

const config = defineCloudflareConfig({
	// For best results consider enabling R2 caching
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache
});

/* (ر8 — نشر Cloudflare) ضغط سيرفر باندل الـ Worker — من غير الضغط الباندل
   كان بيطلع ~4.2MB مضغوط وبيتجاوز حد الخطة المجانية في كلاود فلير
   (3MB مضغوط) برسالة «Worker exceeded size limit» رغم إن البناء نفسه سليم.
   مع الضغط الحجم بينزل كتير تحت الحد. */
config.default.minify = true;

export default config;
