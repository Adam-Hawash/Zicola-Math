import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AIAssistant } from "@/components/student/AIAssistant";
import { RecordingGuard } from "@/components/RecordingGuard";
import { LangBoot } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* (و99) معاينة اللينك لما يتبعت واتساب/فيسبوك — طلب المستر: «لما ابعت
   اللينك بتاع أحمد شعبان عايز صورة الفافيكون (صورة المستر التعليمية)
   تظهر في المعاينة». واتساب بيقرا og:image ولازم يكون رابط مطلق —
   metadataBase بتتحل من دومين الإنتاج على Vercel تلقائيًا.
   الصورة: the-scholar-nav.png (نفس رسمة الفافيكون لكن 512px — الفافيكون
   نفسه 64px صغير فواتساب بيتجاهله) */
var SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : undefined) ||
  (process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : undefined) ||
  "https://zicola-in-math.vercel.app";

export var metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Zicola In Math | Mr. Ahmed Shaban",
  description:
    "منصة Zicola In Math — مستر أحمد شعبان: منصة رياضيات متكاملة. تبسيط الرياضيات، واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة للتقدم.",
  openGraph: {
    title: "Zicola In Math | Mr. Ahmed Shaban",
    description:
      "منصة Zicola In Math — مستر أحمد شعبان: منصة رياضيات متكاملة. تبسيط الرياضيات، واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة للتقدم.",
    type: "website",
    siteName: "Zicola In Math",
    images: [
      {
        url: "/images/the-scholar-nav.png",
        width: 512,
        height: 512,
        alt: "Zicola In Math — مستر أحمد شعبان",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zicola In Math | Mr. Ahmed Shaban",
    description:
      "منصة Zicola In Math — مستر أحمد شعبان: منصة رياضيات متكاملة. تبسيط الرياضيات، واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة للتقدم.",
    images: ["/images/the-scholar-nav.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  var initialConfig: Record<string, string> = {};
  try {
    // Use dynamic import with timeout to avoid blocking the page if DB is slow
    var dbPromise = import("@/lib/db").then(function(dbModule) {
      return dbModule.db.siteConfig.findMany();
    });
    var configs = await Promise.race([
      dbPromise,
      new Promise(function(resolve) { setTimeout(function() { resolve([]) }, 3000) })
    ]);
    for (var i = 0; i < (configs as any[]).length; i++) {
      initialConfig[(configs as any[])[i].key] = (configs as any[])[i].value;
    }
  } catch (e) {
    /* DB not available yet — client will fetch via /api/config */
  }

  // (و70) Favicon = صورة المستر الرسمية (favicon_url من الكونفيج — الافتراضي الصورة الجديدة)
  // (و73) نفس ترميم الـ API: أي favicon_url قديمة (logo.svg) أو فاضية = صورة المستر
  var faviconUrl = initialConfig.favicon_url || "/images/the-scholar-favicon.png";
  if (typeof faviconUrl !== "string" || faviconUrl === "" || faviconUrl.indexOf("logo.svg") !== -1) {
    faviconUrl = "/images/the-scholar-favicon.png";
  }

  // (و98) صورة المستر في الهيرو — بنعملها preload من الـ head نفسه عشان
  // التحميل يبدأ مع أول سطر HTML (المستر: «الصورة تتحمل في الحتة الأولى
  // دي» — كانت بتستنى الهيدريشن والأنيميشن وبتظهر متأخرة ~5 ثواني)
  var heroPhotoUrl = String(initialConfig.instructor_photo || "/images/the-scholar-full.png");

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* (و64) سكريبت مبكر — الثيم (ليلي/نهاري) واللغة بيتريّكوا قبل أول رسم
            عشان مفيش وميض غلط: الثيم من مفتاح next-themes «theme» والافتراضي ليلي،
            (10-b) اللغة: الافتراضي إنجليزي LTR — بس لو mg_lang محفوظ «ar»
            الاتجاه بيرجع RTL قبل أول رسم عشان العربي مايشوفش وميض */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');var c=(t==='light'?'light':'dark');var el=document.documentElement;el.classList.remove('dark','light');el.classList.add(c);el.style.colorScheme=c;if(localStorage.getItem('mg_lang')==='ar'){el.lang='ar';el.dir='rtl'}else{el.lang='en';el.dir='ltr'}}catch(e){}",
          }}
        />
        {/* Cairo via Google Fonts CDN (avoids Turbopack build error) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Favicon — user's custom image, NO Z logo */}
        <link rel="icon" href={faviconUrl} />

        {/* (و98) تحميل صورة المستر يبدأ فورًا مع الـ HTML — مش بعد الهيدريشن */}
        <link rel="preload" as="image" href={heroPhotoUrl} fetchPriority="high" />

        {/* Inject config server-side for instant client access */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.__INITIAL_CONFIG__=" +
              JSON.stringify(initialConfig),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        <ThemeProvider>{children}</ThemeProvider>
        {/* (و64) قراءة اللغة المحفوظة وتطبيقها على <html> */}
        <LangBoot />
        {/* (و47) المساعد الذكي رجع زي ما كان — المستر طلب رجوعه بنفس المميزات (شيرين بس هي اللي اتشالت) */}
        <AIAssistant />
        {/* حماية عامة من التسجيل/التصوير + أدوات المطوّر في كل الصفحات */}
        <RecordingGuard />
        <Toaster />
        {/* Toaster بتاع sonner — كل رسائل التنبيه في المنصة بتستخدمه (toast من sonner) */}
        <SonnerToaster position="top-center" richColors closeButton expand={false} />
      </body>
    </html>
  );
}
