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

export var metadata: Metadata = {
  title: "The Scholar in Math | مستر أحمد شعبان",
  description:
    "منصة The Scholar in Math — مستر أحمد شعبان: منصة رياضيات متكاملة. تبسيط الرياضيات، واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة للتقدم.",
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
  var faviconUrl = initialConfig.favicon_url || "/images/the-scholar-favicon.png";

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* (و64) سكريبت مبكر — الثيم (ليلي/نهاري) واللغة بيتريّكوا قبل أول رسم
            عشان مفيش وميض غلط: الثيم من مفتاح next-themes «theme» والافتراضي ليلي،
            واللغة من mg_lang لو مختار إنجليزي الاتجاه بيتقلب LTR */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');var c=(t==='light'?'light':'dark');var el=document.documentElement;el.classList.remove('dark','light');el.classList.add(c);el.style.colorScheme=c;if(localStorage.getItem('mg_lang')==='en'){el.lang='en';el.dir='ltr'}}catch(e){}",
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
