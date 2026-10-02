import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AIAssistant } from "@/components/student/AIAssistant";
import { FloatingInstallButton } from "@/components/InstallPwaButton";
import { RecordingGuard } from "@/components/RecordingGuard";
import { DeviceMessages } from "@/components/DeviceMessages";
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

/* (و103) الصفحة كلها dynamic — إعدادات الهيد (الفافيكون/صورة المعلم/الكونفيج
   المبدئي) كانت بتتجمّد وقت البناء: أي تغيير صورة من الأدمن كان محتاج
   deploy جديد عشان يبان (وده اللي خلّى الفافيكون يختفي لما مسارات
   الصور اتغيرت والقيمة القديمة اتحفظت في البناء). بالـ force-dynamic
   الهيد بيتقري من قاعدة البيانات في كل طلب — أي تغيير من الأدمن يظهر فورًا */
export const dynamic = "force-dynamic";

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
  /* (Z-6) PWA — المنصة تتنصّب كتطبيق من كروم على الموبايل
     باسم المنصة وأيقونة الفافيكون (نفس نمط باقي المنصات) */
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zicola In Math",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  var initialConfig: Record<string, string> = {};
  try {
    /* (تسريع المنصة) الكونفيج من الكاش (30s) بدل قراءة قاعدة Turso في كل طلب
       — نفس سلوك الشفاء الذاتي: لو القاعدة بطيئة/ناقصة، الكلينت هيجيب عبر /api/config */
    var dbPromise = import("@/lib/site-config").then(function(cfgModule) {
      return cfgModule.getSiteConfigRaw();
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

        {/* (Z-6) PWA — تثبيت المنصة كتطبيق: اسمها Zicola In Math
            وأيقونتها رسمة الفافيكون (pwa-icon من نفس الصورة بجودات أعلى)،
            theme-color داكن زي الهيرو، وسپلاش iOS بأيقونة المنصة */}
        <meta name="theme-color" content="#0F0D0A" />
        {/* (Z-6) سفاري/iOS لسه بيقرا النسخة بـ apple- prefix — Next 16 مش بيطلعها */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/splash-1290x2796.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" href="/splash-1284x2778.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/splash-1179x2556.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/splash-1170x2532.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/splash-1125x2436.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/splash-828x1792.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/splash-750x1334.png" />

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
        {/* (Z-7) الزرار العايم الثابت «ثبّت التطبيق» — شمال تحت في كل الصفحات (زي Maths-Genius) */}
        <FloatingInstallButton />
        {/* حماية عامة من التسجيل/التصوير + أدوات المطوّر في كل الصفحات */}
        <RecordingGuard />
        {/* (2026-و111) رسايل حل الشكاوى للجهاز — أول ما الطالب يفتح المنصة
            من الجهاز اللي بعت منه الشكوى تظهرله رسالة الأدمن بالحل */}
        <DeviceMessages />
        <Toaster />
        {/* Toaster بتاع sonner — كل رسائل التنبيه في المنصة بتستخدمه (toast من sonner) */}
        <SonnerToaster position="top-center" richColors closeButton expand={false} />
      </body>
    </html>
  );
}
