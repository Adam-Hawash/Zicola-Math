import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  poweredByHeader: false,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  serverExternalPackages: [
    '@libsql/client',
    '@prisma/adapter-libsql',
    '@libsql/isomorphic-fetch',
    '@libsql/isomorphic-ws',
    /* (و49) القص السيرفري للرسومات — pdf.js legacy + napi canvas لازم يفضلوا خارجية */
    'pdfjs-dist',
    '@napi-rs/canvas',
    /* (ر8) qrcode بقى runtime import مشفية عن الباندلر — خارجية عشان
       Vercel/Node يجيبوها من node_modules وقت التشغيل */
    'qrcode',
  ],
  /* (و50) كل أصول القص السيرفري لازم توصل مع الدالة على Vercel:
     خطوط pdf.js + باكجات napi canvas الأصلية (.node binaries) — من غيرها
     import('@napi-rs/canvas') بيقع في اللambda والقص بيفشل بصمت بالكامل */
  outputFileTracingIncludes: {
    '/api/ai-extract': [
      './node_modules/pdfjs-dist/**',
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
      './node_modules/@napi-rs/canvas-linux-x64-musl/**',
    ],
    /* (و50) مسار الملفات الكبيرة بقى بيقص كمان على السيرفر → محتاج نفس الأصول */
    '/api/ai-extract-pages': [
      './node_modules/pdfjs-dist/**',
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
      './node_modules/@napi-rs/canvas-linux-x64-musl/**',
    ],
    /* (ر8) qrcode بقى runtime import — لازم يتتبع للمسار ده على Vercel */
    '/api/player/[ticket]': [
      './node_modules/qrcode/**',
    ],
    /* (و50) خط إنقاذ الرسمات من السيرفر — نفس أصول القص */
    '/api/crop-figures': [
      './node_modules/pdfjs-dist/**',
      './node_modules/@napi-rs/canvas/**',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**',
      './node_modules/@napi-rs/canvas-linux-x64-musl/**',
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '500mb' },
    optimizePackageImports: ['lucide-react', 'framer-motion', 'embla-carousel-react', 'react-day-picker', 'date-fns'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    /* (ر32) تقليل استهلاك فيرسل: الصور المولدة (_next/image — المعرض والثامبنيلز)
       بتتحشر في CDN 30 يوم بدل القصور الافتراضي — الطالب بترد الصورة من الحواف
       بدل تشغيل دالة تحسين لكل صورة لكل طالب — بدون أي فرق بصري */
    minimumCacheTTL: 2678400,
  },
  async headers() {
    // Production-only: immutable caching for static assets.
    // In dev these headers make the browser stick to stale chunks forever.
    if (process.env.NODE_ENV !== 'production') return [];
    return [
      { source: '/uploads/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      /* (ر32) تقليل استهلاك فيرسل — كاش CDN للردود العامة الآمنة: داتا عامة للزوار
         والطلاب بدون أي هوية (أرقام الرئيسية + صور المعرض) — النداءات المتكررة بتترد
         من حواف فيرسل في ميلي ثواني بدل تشغيل دالة لكل طالب — التعديلات بتظهر
         خلال أقصى 60 ثانية — ومسارات الهوية (admin/students/videos/daily-info/player)
         فاضلة dynamic زي ما هي عشان ما يتأثرش أي وظيفة */
      { source: '/api/stats', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' }] },
      { source: '/api/gallery', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' }] },
    ];
  },
  turbopack: {},
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
