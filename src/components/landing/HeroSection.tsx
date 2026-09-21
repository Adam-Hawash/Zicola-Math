'use client'

import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
/* (و64) الترجمة الحقيقية عربي/إنجليزي */
import { useT, useLangStore } from '@/lib/i18n'
/* (و73) أنيميشن دخول ناعم (الصورة بتعلي من تحت والنص بيظهر) */
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { GraduationCap, CalendarClock } from 'lucide-react'

/* (و73) شكل الشرارة/الانفجار النجمي خلف المعلم — نجمة 8 رؤوس حادة
   (نفس الشكل اللي في الصورة المرجعية) — بنحسب النقاط مرة واحدة */
var starPoints = (function () {
  var pts: string[] = []
  var cx = 100
  var cy = 100
  var outer = 98
  var inner = 46
  for (var i = 0; i < 16; i++) {
    var r = i % 2 === 0 ? outer : inner
    var a = -Math.PI / 2 + (i * Math.PI) / 8
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1))
  }
  return pts.join(' ')
})()

/* (و73) علامات تدريج المنقلة (Protractor) — كل 15° وخط أطول كل 45° */
var protractorTicks = (function () {
  var lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
  for (var a = 0; a <= 180; a += 15) {
    var rad = (a * Math.PI) / 180
    var major = a % 45 === 0
    var r1 = major ? 40 : 46
    lines.push({
      x1: 60 + r1 * Math.cos(rad),
      y1: 60 - r1 * Math.sin(rad),
      x2: 60 + 53 * Math.cos(rad),
      y2: 60 - 53 * Math.sin(rad),
      major: major,
    })
  }
  return lines
})()

export default function HeroSection() {
  /* (و64) الترجمة */
  const T = useT()
  /* (و71) لغة الزائر الحالية — لعرض المحتوى المكتوب من الأدمن بالعربي/الإنجليزي */
  var lang = useLangStore(function (s) { return s.lang })
  const {
    setView,
    siteConfig,
    setSiteConfig,
    configLoaded,
  } = useAppStore()

  var initialCfg = (typeof window !== 'undefined' && (window as any).__INITIAL_CONFIG__) || {}
  var cfg = configLoaded ? siteConfig : (Object.keys(siteConfig).length > 0 ? siteConfig : initialCfg)

  useEffect(() => {
    if (!configLoaded && Object.keys(siteConfig).length === 0) {
      fetch('/api/config')
        .then((r) => r.json())
        .then((data) => {
          setSiteConfig(data)
          useAppStore.getState().setConfigLoaded(true)
        })
        .catch(() => {})
    }
  }, [configLoaded, setSiteConfig, siteConfig])

  /* (و73) صورة المعلم من قاعدة البيانات (instructor_photo من لوحة الأدمن —
     ممنوع نغير المفتاح) — بدون صورة بيرجع فافيكون المستر الرسمي لو موجود
     وأقرب احتياط أيقونة القبعة. البانر القديم (hero_bg_image) شالوه و72 نهائيًا */
  const dbPhoto = cfg.instructor_photo || ''
  const heroPhoto = dbPhoto
  const showPhoto = !!dbPhoto

  /* (و71) اختيار نص الأدمن حسب اللغة: إنجليزي بقرأ المفتاح *_en من لوحة
     الأدمن (أو الافتراضي الإنجليزي)، عربي بقرأ المفتاح الأساسي —
     فالمستر يكتب العربي والإنجليزي كل واحد لوحده من لوحة التحكم */
  var L = function (key: string, arFallback: string, enFallback: string): string {
    if (lang === 'en') {
      var en = (cfg as any)[key + '_en']
      if (en && String(en).trim() !== '') return String(en)
      return enFallback
    }
    var ar = (cfg as any)[key]
    return ar && String(ar).trim() !== '' ? String(ar) : arFallback
  }

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0a1730_0%,#0e2247_55%,#123061_100%)]" dir="rtl">
      {/* Subtle tiny dots + faint math symbols background — (و73) retinted أبيض/أزرق سماوي على الكحلي (من غير دهبي — زي الصورة المرجعية) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Faint math symbols - very subtle background */}
        <div className="absolute text-[120px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '5%', right: '5%' }}>√</div>
        <div className="absolute text-[90px] font-bold text-[#8fb7ff]/[0.08] leading-none select-none" style={{ top: '15%', left: '8%' }}>π</div>
        <div className="absolute text-[100px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '50%', left: '5%' }}>∑</div>
        <div className="absolute text-[80px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '65%', right: '10%' }}>∫</div>
        <div className="absolute text-[70px] font-bold text-[#8fb7ff]/[0.07] leading-none select-none" style={{ top: '85%', left: '15%' }}>∞</div>
        <div className="absolute text-[60px] font-bold text-[#7cc0ff]/[0.08] leading-none select-none" style={{ top: '25%', right: '40%' }}>a²</div>
        <div className="absolute text-[55px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '70%', left: '40%' }}>b²</div>
        <div className="absolute text-[65px] font-bold text-[#7cc0ff]/[0.07] leading-none select-none" style={{ top: '40%', right: '8%' }}>Δ</div>
        <div className="absolute text-[50px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '10%', left: '30%' }}>θ</div>
        <div className="absolute text-[75px] font-bold text-[#8fb7ff]/[0.06] leading-none select-none" style={{ top: '80%', right: '30%' }}>÷</div>

        {/* Geometric shapes - very subtle background */}
        <svg className="absolute text-white/[0.07]" style={{ top: '8%', left: '20%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 45,45 5,45" />
        </svg>
        <svg className="absolute text-white/[0.07]" style={{ top: '55%', right: '20%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="25" cy="25" r="20" />
        </svg>
        <svg className="absolute text-white/[0.07]" style={{ top: '78%', left: '40%', width: '45px', height: '45px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="8" y="8" width="34" height="34" />
        </svg>
        <svg className="absolute text-[#8fb7ff]/[0.08]" style={{ top: '32%', right: '45%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 45,20 38,45 12,45 5,20" />
        </svg>
        <svg className="absolute text-[#8fb7ff]/[0.08]" style={{ top: '92%', right: '5%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 42,15 42,35 25,45 8,35 8,15" />
        </svg>
        <svg className="absolute text-white/[0.07]" style={{ top: '45%', left: '48%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5,45 45,45 5,5" />
          <path d="M 5,15 L 15,15 L 15,45" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>

        {/* 18 dots — منتشرة بألوان أزرق/سماوي/أبيض (بدل دهبي القديم) */}
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '8%', right: '15%', background: '#7cc0ff', boxShadow: '0 0 5px #7cc0ff' }} />
        <div className="hero-dot hero-dot-2 w-1 h-1 rounded-full" style={{ top: '12%', left: '25%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-3 w-1 h-1 rounded-full" style={{ top: '20%', right: '40%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-4 w-1 h-1 rounded-full" style={{ top: '6%', left: '55%', background: '#7cc0ff', boxShadow: '0 0 5px #7cc0ff' }} />
        <div className="hero-dot hero-dot-5 w-1 h-1 rounded-full" style={{ top: '28%', right: '8%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-6 w-1 h-1 rounded-full" style={{ top: '32%', left: '15%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-7 w-1 h-1 rounded-full" style={{ top: '38%', right: '35%', background: '#7cc0ff', boxShadow: '0 0 5px #7cc0ff' }} />
        <div className="hero-dot hero-dot-8 w-1 h-1 rounded-full" style={{ top: '25%', left: '45%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '48%', left: '8%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-3 w-1 h-1 rounded-full" style={{ top: '52%', right: '20%', background: '#7cc0ff', boxShadow: '0 0 5px #7cc0ff' }} />
        <div className="hero-dot hero-dot-5 w-1 h-1 rounded-full" style={{ top: '45%', left: '55%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-2 w-1 h-1 rounded-full" style={{ top: '65%', right: '10%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-4 w-1 h-1 rounded-full" style={{ top: '70%', left: '20%', background: '#7cc0ff', boxShadow: '0 0 5px #7cc0ff' }} />
        <div className="hero-dot hero-dot-6 w-1 h-1 rounded-full" style={{ top: '75%', right: '30%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-8 w-1 h-1 rounded-full" style={{ top: '62%', left: '45%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-7 w-1 h-1 rounded-full" style={{ top: '88%', right: '15%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '92%', left: '35%', background: '#7cc0ff', boxShadow: '0 0 5px #7cc0ff' }} />
      </div>

      {/* Ambient light effects — (و73) هالات زرقاء بدل الدهبي */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 right-20 h-96 w-96 rounded-full bg-[#3b6db4]/20 blur-[100px]" />
        <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-[#2f6fd8]/15 blur-[100px]" />
        <div className="absolute top-16 left-10 text-[#8fb7ff]/10 text-6xl font-light select-none hidden lg:block">
          a2+b2=c2
        </div>
        <div className="absolute bottom-32 right-16 text-[#8fb7ff]/8 text-5xl font-light select-none hidden lg:block">
          f(x)
        </div>
      </div>

      {/* (و73) المنقلة الزرقاء 3D — أقصى يسار الهيرو زي الصورة المرجعية
          (مخفية على الموبايل الصغير عشان النضافة ولا تسبب overflow) */}
      <div className="hidden md:block absolute left-3 lg:left-7 top-[34%] w-24 lg:w-32 z-0 pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 120 66" className="w-full drop-shadow-[0_14px_26px_rgba(2,8,23,0.55)]" style={{ transform: 'rotate(-20deg)' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="heroProtractorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a8cff" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          {/* جسم المنقلة (نص دائرة) */}
          <path d="M6,60 A54,54 0 0 1 114,60 Z" fill="url(#heroProtractorGrad)" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
          {/* الجزء الزجاجي الداخلي */}
          <path d="M34,60 A26,26 0 0 1 86,60 Z" fill="rgba(255,255,255,0.18)" />
          {/* تدريجات الزوايا */}
          <g stroke="rgba(255,255,255,0.75)" strokeLinecap="round">
            {protractorTicks.map(function (t, i) {
              return <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth={t.major ? 2 : 1} opacity={t.major ? 0.95 : 0.55} />
            })}
          </g>
          {/* خط القاعدة + الثقب الصغير */}
          <line x1="8" y1="60" x2="112" y2="60" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="4.5" fill="#0a1730" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Text Content — (و73) نفس تكوين الصورة المرجعية:
              سطر أبيض ضخم + سطر أزرق سماوي فاتح + فقرة + زر أزرق حبتة */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            className="space-y-6 text-center lg:text-right order-2 lg:order-1"
          >
            {/* Title */}
            <h1 className="tracking-tight">
              {/* السطر الأول — أبيض كبير تقيل (افتراضي: مستر الماث) */}
              <span className="block text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                {L('hero_title_line1', 'مستر الماث', 'Mr. Math')}
              </span>
              {/* السطر الثاني — أزرق سماوي فاتح (افتراضي: م/أحمد شعبان) */}
              <span dir="auto" className="block mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#7cc0ff] leading-snug">
                {L('hero_title_line2', 'م/أحمد شعبان', 'Mr. Ahmed Shaban')}
              </span>
            </h1>

            {/* Subtitle — نفس نص الأدمن الافتراضي زي ما هو (و72) */}
            <p className="max-w-xl text-white/80 text-base sm:text-lg leading-relaxed lg:mx-0 mx-auto">
              {L(
                'hero_subtitle',
                'نبسّط لك الرياضيات ونجعلها سهلة وممتعة! Algebra, Geometry, Formulas, Cheat Sheets — واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة لتقدّمك الأكاديمي.',
                'We make math simple and fun! Algebra, Geometry, Formulas, Cheat Sheets — weekly homework, regular exams, and continuous tracking of your academic progress.'
              )}
            </p>

            {/* CTA — (و73) زر أزرق حبتة rounded-full زي الصورة المرجعية */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center sm:items-start">
              <Button
                size="lg"
                className="text-base px-9 py-6 min-h-[44px] rounded-full bg-[#1f7fe8] hover:bg-[#3b90ef] text-white font-bold transition-colors duration-200 shadow-[0_14px_34px_rgba(31,127,232,0.35)]"
                onClick={() => setView('auth-register')}
              >
                {L('hero_cta_text', 'اعمل حسابك', 'Create Account')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-6 min-h-[44px] rounded-full border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors duration-200"
                onClick={() => setView('auth-login')}
              >
                {T('عندك حساب؟ ادخل هنا', 'Have an account? Log in')}
              </Button>
            </div>

            {/* مواعيد السنتر — لينك هادي من غير زر كبير (عشان الهيرو يفضل نضيف زي المرجع) */}
            <div className="flex justify-center lg:justify-start">
              <a
                href="/schedule"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-[#7cc0ff] transition-colors"
              >
                <CalendarClock className="h-4 w-4" />
                {T('مواعيد السنتر', 'Center Schedule')}
              </a>
            </div>

            {/* Hero Developer / Adam Hawash branding */}
            <div className="pt-2 flex flex-col items-center lg:items-start gap-1">
              <a
                href={cfg.hero_developer_url || 'https://prime-developer-portfolio-11.vercel.app'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-white/60 hover:text-[#7cc0ff] transition-colors"
              >
                {cfg.hero_developer_label || 'Hero Developer'}
              </a>
              <div className="h-px w-16 bg-white/10" />
              <a
                href={cfg.hero_developer_url || 'https://prime-developer-portfolio-11.vercel.app'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 font-light tracking-wider hover:text-[#7cc0ff] transition-colors"
              >
                {cfg.footer_made_by_label || 'Developed by Adam Hawash'}
              </a>
            </div>
          </motion.div>

          {/* Instructor Photo — (و73) نفس مشهد الصورة المرجعية:
              شرارة زرقاء خلف المستر + توهج أزرق + صورة طالعة من سحابة بيضاء
              قطنية كبيرة + √x أزرق تقيل فوق شمال (يمين المستر) + منقلة شمال الخالص */}
          <motion.div
            initial={{ opacity: 0, y: 56 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut', delay: 0.05 }}
            className="flex justify-center lg:justify-center order-1 lg:order-2"
          >
            <div className="relative w-64 sm:w-80 lg:w-[420px] mb-4">
              {/* التوهج الأزرق الأفتح خلف المعلم */}
              <div aria-hidden="true" className="absolute top-[-12%] left-1/2 -translate-x-1/2 h-[340px] w-[340px] sm:h-[400px] sm:w-[400px] rounded-full bg-[#2f6fd8]/25 blur-[90px] z-0" />

              {/* الشرارة النجمية الزرقاء خلف المعلم — نجمة 8 رؤوس حادة */}
              <svg
                aria-hidden="true"
                viewBox="0 0 200 200"
                className="absolute top-[-16%] left-1/2 -translate-x-1/2 w-[128%] max-w-none z-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="rotate(10 100 100)">
                  <polygon points={starPoints} fill="#2f6fd8" opacity="0.5" />
                  <polygon points={starPoints} fill="#3b82f6" opacity="0.28" transform="translate(100 100) scale(0.62) translate(-100 -100)" />
                </g>
              </svg>

              {showPhoto ? (
                <img
                  src={heroPhoto}
                  alt={L('instructor_name', 'مستر أحمد شعبان', 'Mr. Ahmed Shaban')}
                  width={1024}
                  height={1024}
                  loading="eager"
                  fetchPriority="high"
                  className="relative z-10 w-full h-auto max-h-[420px] sm:max-h-[460px] mx-auto object-contain object-top"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to bottom, black 62%, transparent 96%)',
                    maskImage: 'linear-gradient(to bottom, black 62%, transparent 96%)',
                  }}
                />
              ) : (
                <div className="relative z-10 w-full aspect-square max-h-[420px] sm:max-h-[460px] flex items-center justify-center">
                  {/* (و73) فولباك الصورة: فافيكون المستر الرسمي لو موجود وإلا أيقونة القبعة */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/the-scholar-favicon.png"
                    alt={L('instructor_name', 'مستر أحمد شعبان', 'Mr. Ahmed Shaban')}
                    className="w-56 h-56 object-contain"
                    onError={function (e) {
                      var el = e.currentTarget
                      el.style.display = 'none'
                      var f = el.nextElementSibling as HTMLElement | null
                      if (f) f.style.display = 'flex'
                    }}
                  />
                  <div className="absolute inset-0 hidden items-center justify-center">
                    <GraduationCap className="h-24 w-24 text-[#7cc0ff]/50" />
                  </div>
                </div>
              )}

              {/* √x الأزرق التقيل — فوق يسار الصورة (يمين المستر في التكوين)
                  (و73-B2) dir=ltr عشان الرمز ما ينقلبش «x√» في الوضع العربي */}
              <div aria-hidden="true" className="absolute -top-4 right-0 sm:-right-5 z-20 pointer-events-none select-none">
                <span dir="ltr" className="inline-block text-5xl sm:text-6xl font-extrabold text-[#3b82f6] drop-shadow-[0_6px_18px_rgba(37,99,235,0.45)]" style={{ transform: 'rotate(-8deg)' }}>
                  √x
                </span>
              </div>

              {/* السحابة البيضاء القطنية الكبيرة — بتغطي ذيل الصورة (z فوق الصورة) */}
              <div className="relative z-20 -mt-14 sm:-mt-20 flex justify-center">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 560 200"
                  className="w-[112%] max-w-none drop-shadow-[0_20px_44px_rgba(2,8,23,0.55)]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="heroCloudGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="55%" stopColor="#f6f8fe" />
                      <stop offset="100%" stopColor="#e0e9f8" />
                    </linearGradient>
                    <filter id="heroCloudShadowBlur" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="10" />
                    </filter>
                  </defs>
                  {/* ظل ناعم عريض تحت السحابة */}
                  <ellipse cx="280" cy="180" rx="256" ry="14" fill="#06122a" opacity="0.45" filter="url(#heroCloudShadowBlur)" />
                  {/* طبقات السحابة — بفّات أكتر وأنعم (كارتوني قطني) */}
                  <g fill="url(#heroCloudGrad)">
                    <ellipse cx="280" cy="134" rx="266" ry="50" />
                    <circle cx="78" cy="110" r="44" />
                    <circle cx="150" cy="78" r="54" />
                    <circle cx="248" cy="56" r="62" />
                    <circle cx="352" cy="66" r="58" />
                    <circle cx="448" cy="92" r="50" />
                    <circle cx="506" cy="120" r="36" />
                  </g>
                  {/* تظليل رمادي-أزرق خفيف تحت البفّات (عمق) */}
                  <g fill="#d5e0f3" opacity="0.55">
                    <ellipse cx="176" cy="160" rx="82" ry="16" />
                    <ellipse cx="390" cy="162" rx="90" ry="16" />
                  </g>
                  <g fill="#c8d6ee" opacity="0.4">
                    <ellipse cx="280" cy="168" rx="120" ry="14" />
                  </g>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
