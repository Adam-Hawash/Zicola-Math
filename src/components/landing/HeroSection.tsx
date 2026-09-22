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
    /* (2-c) خلفية الهيرو مطابقة للصورة المرجعية: أزرق ملكي مشع فوق (بهوت سبوت
       أفتح عند منطقة النص يمين فوق) بيبهد لأسود/فحمي تحت — عكس النسخة القديمة
       اللي كانت مائلة 105deg */
    <section
      className="relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 75% 0%, rgba(59,130,246,0.30) 0%, transparent 55%), linear-gradient(180deg, #0a4588 0%, #073263 22%, #041a33 55%, #020b16 85%, #01060c 100%)' }}
      dir="rtl"
    >
      {/* (2-c) نمط شبكة مربعات بخطوط زرقاء فاتحة (زي المرجع) بحجم 64px */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(125,180,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(125,180,255,0.10) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Subtle tiny dots + faint math symbols background — (و73) retinted أبيض/أزرق سماوي على الكحلي (من غير دهبي — زي الصورة المرجعية) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* (2-c) رموز خلفية باهتة — رموز وأماكن مختلفة تمامًا عن منصة Maths
            Genius (طلب المستر: «الرموز في الباك جراوند خليها في أماكن مختلفة
            وأشكال مختلفة عن الـ جينيوس») — (و77) الشفافيات اتضاعفت بالضعف
            («الرموز ما تقترهاش قوي») 0.05→0.025 و0.07→0.035 و0.08→0.04 */}
        <div className="absolute text-[85px] font-bold text-white/[0.025] leading-none select-none" style={{ top: '16%', right: '24%' }}>×</div>
        <div className="absolute text-[90px] font-bold text-[#8fb7ff]/[0.04] leading-none select-none" style={{ top: '34%', left: '10%' }}>+</div>
        <div className="absolute text-[75px] font-bold text-white/[0.025] leading-none select-none" style={{ top: '7%', left: '52%' }}>=</div>
        <div className="absolute text-[65px] font-bold text-[#8fb7ff]/[0.035] leading-none select-none" style={{ top: '58%', right: '36%' }}>%</div>
        <div dir="ltr" className="absolute text-[55px] font-bold text-white/[0.025] leading-none select-none" style={{ top: '86%', right: '10%' }}>f(x)</div>
        <div className="absolute text-[70px] font-bold text-[#8fb7ff]/[0.04] leading-none select-none" style={{ top: '70%', left: '28%' }}>∠</div>
        <div className="absolute text-[60px] font-bold text-white/[0.025] leading-none select-none" style={{ top: '45%', right: '58%' }}>½</div>
        <div dir="ltr" className="absolute text-[45px] font-bold text-[#8fb7ff]/[0.035] leading-none select-none" style={{ top: '92%', left: '45%' }}>90°</div>

        {/* (2-c) أشكال هندسية جديدة كلها: معيّن/شبه منحرف/متوازي أضلاع/مكعب
            أيزومتري/نجمة رباعية/علامة زائد — في أماكن مختلفة عن مثلث/دائرة/
            مربع/خماسي/سداسي جينيوس — (و77) نفس ستايل الستروك بس أنعم بالنص */}
        <svg className="absolute text-white/[0.035]" style={{ top: '22%', left: '38%', width: '52px', height: '52px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 45,25 25,45 5,25" />
        </svg>
        <svg className="absolute text-[#8fb7ff]/[0.04]" style={{ top: '48%', right: '6%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="14,8 36,8 45,42 5,42" />
        </svg>
        <svg className="absolute text-white/[0.035]" style={{ top: '80%', left: '55%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="16,8 45,8 34,42 5,42" />
        </svg>
        <svg className="absolute text-[#8fb7ff]/[0.04]" style={{ top: '62%', left: '5%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 42,14.5 42,33.5 25,43 8,33.5 8,14.5" />
          <path d="M8,14.5 L25,24 L42,14.5 M25,24 L25,43" />
        </svg>
        <svg className="absolute text-white/[0.035]" style={{ top: '94%', right: '30%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,3 30.5,19.5 47,25 30.5,30.5 25,47 19.5,30.5 3,25 19.5,19.5" />
        </svg>
        <svg className="absolute text-[#8fb7ff]/[0.04]" style={{ top: '36%', right: '80%', width: '48px', height: '48px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20,6 H30 V20 H44 V30 H30 V44 H20 V30 H6 V20 H20 Z" />
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

      {/* Ambient light effects — (و73) هالات زرقاء بدل الدهبي
          (و75) الهالة اليمين خُفّضت واتزحزحت للنص عشان اليمين يفضل شبه أسود زي المرجع */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-24 right-[32%] h-80 w-80 rounded-full bg-[#3b6db4]/10 blur-[100px]" />
        <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-[#2f6fd8]/15 blur-[100px]" />
        {/* (2-c) معادلات محيطية جديدة مختلفة عن جينيوس (a2+b2=c2 و f(x) القديمين) — (و77) أنعم بالنص */}
        <div dir="ltr" className="absolute top-16 right-10 text-[#8fb7ff]/5 text-6xl font-light select-none hidden lg:block">
          y=mx+b
        </div>
        <div dir="ltr" className="absolute bottom-24 left-10 text-[#8fb7ff]/4 text-5xl font-light select-none hidden lg:block">
          x²+y²=r²
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
            {/* Title — (و77) شادو أسود ناعم على العنوان والفقرة
                («خلي الـhero section فيه زي شادو أسود كده شوية») —
                يرفع النص عن الخلفية من غير تقيل */}
            <h1 className="tracking-tight drop-shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
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
            <p className="max-w-xl text-white/80 text-base sm:text-lg leading-relaxed lg:mx-0 mx-auto drop-shadow-[0_10px_26px_rgba(0,0,0,0.45)]">
              {L(
                'hero_subtitle',
                'نبسّط لك الرياضيات ونجعلها سهلة وممتعة! Algebra, Geometry, Formulas, Cheat Sheets — واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة لتقدّمك الأكاديمي.',
                'We make math simple and fun! Algebra, Geometry, Formulas, Cheat Sheets — weekly homework, regular exams, and continuous tracking of your academic progress.'
              )}
            </p>

            {/* CTA — (و75) زر أزرق بزوايا كبيرة rounded-xl زي الصورة المرجعية
                (النص بيفضل من الأدمن hero_cta_text زي ما هو) */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center sm:items-start">
              <Button
                size="lg"
                className="text-base px-9 py-6 min-h-[44px] rounded-xl bg-[#1f7fe8] hover:bg-[#3b90ef] text-white font-bold transition-colors duration-200 shadow-[0_14px_34px_rgba(31,127,232,0.35)]"
                onClick={() => setView('auth-register')}
              >
                {L('hero_cta_text', 'اعمل حسابك', 'Create Account')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-6 min-h-[44px] rounded-xl border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors duration-200"
                onClick={() => setView('auth-login')}
              >
                {T('عندك حساب؟ ادخل هنا', 'Have an account? Log in')}
              </Button>
            </div>

            {/* مواعيد السنتر — كارت خفيف بحواف ناعمة (10-b) بدل النص المجرّد:
                rounded-xl + حد رفيع شفاف + خلفية خفيفة — من غير ظل تقيل */}
            <div className="flex justify-center lg:justify-start">
              <a
                href="/schedule"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:text-[#7cc0ff] hover:bg-white/10 hover:border-white/25 transition-colors"
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
                {/* (10-b) توقيع المطور الرسمي «Adam Hawash» (من غير h) بطلب صاحب المنصة */}
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
            <div className="relative w-64 sm:w-80 lg:w-[440px] mb-4">
              {/* التوهج الأزرق الأفتح خلف المعلم — (و77) أنعم بالنص
                  («الحاجات اللي ورا صورة المستر ما تقترهاش») 0.25→0.12 */}
              <div aria-hidden="true" className="absolute top-[-12%] left-1/2 -translate-x-1/2 h-[340px] w-[340px] sm:h-[400px] sm:w-[400px] rounded-full bg-[#2f6fd8]/12 blur-[90px] z-0" />

              {/* الشرارة النجمية الزرقاء خلف المعلم — نجمة 8 رؤوس حادة
                  (و77) الشفافيات اتضاعفت بالنص 0.5→0.25 و0.28→0.14 */}
              <svg
                aria-hidden="true"
                viewBox="0 0 200 200"
                className="absolute top-[-16%] left-1/2 -translate-x-1/2 w-[128%] max-w-none z-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="rotate(10 100 100)">
                  <polygon points={starPoints} fill="#2f6fd8" opacity="0.25" />
                  <polygon points={starPoints} fill="#3b82f6" opacity="0.14" transform="translate(100 100) scale(0.62) translate(-100 -100)" />
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
                  className="relative z-10 w-full h-auto max-h-[460px] sm:max-h-[520px] mx-auto object-contain object-top"
                  style={{
                    /* (و78) طلب المستر: الصورة كانت مخفية من تحت (فيد تدريجي بقّى
                       من 62% بس!) + السحابة مغطيها — عاوز الصورة تبقى باينة.
                       الماسك دلوقتي: بيخلي المحتوى كله باين (الفيدي بقت على آخر
                       15% بس ورا السحابة) + حواف ناعمة على الجوانب والفوق
                       عشان مستطيل خلفية الصورة ميبانش — بماسكين متقاطعين */
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 84%, transparent 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 84%, transparent 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                    WebkitMaskComposite: 'source-in',
                    maskComposite: 'intersect',
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

              {/* (2-c) السحابة الكرتونية المسطّحة — أبيض صافي ببفّات دائرية واضحة
                  زي الصورة المرجعية بالظبط (من غير أي تدرج — فلات فيكتور)،
                  وبتغطي ذيل الصورة والمستر طالع من وراها
                  (و77) طلب المستر: «السحابة تكون فيها شادو أسود وخطوط» —
                  أ) فيلتر feDropShadow أسود ناعم (dy=14 / blur=12 / أسود 45%)
                  ب) خطوط كرتونية: ستروك كحلي #16233B بشفافية 0.3 وسُمك 3
                     على البفّات والقاعدة (أوتلاين كرتوني) */}
              <div className="relative z-20 -mt-8 sm:-mt-12 flex justify-center">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 560 230"
                  className="w-[112%] max-w-none drop-shadow-[0_20px_44px_rgba(2,8,23,0.55)]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <filter id="heroCloudShadowBlur" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="10" />
                    </filter>
                    {/* (و77) الشادو الأسود الناعم للسحابة نفسها */}
                    <filter id="heroCloudBlackShadow" x="-40%" y="-40%" width="180%" height="200%">
                      <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#000000" floodOpacity="0.5" />
                    </filter>
                  </defs>
                  {/* ظل ناعم عريض تحت السحابة */}
                  <ellipse cx="280" cy="220" rx="248" ry="13" fill="#06122a" opacity="0.45" filter="url(#heroCloudShadowBlur)" />
                  {/* جسم السحابة الأبيض الصافي — بيضاوية قاعدة + بفّات دائرية
                      (و77) + شادو أسود ناعم + ستروك كرتوني كحلي على كل بفة والقاعدة */}
                  <g fill="#ffffff" stroke="#16233B" strokeOpacity="0.3" strokeWidth="3" filter="url(#heroCloudBlackShadow)">
                    <ellipse cx="280" cy="165" rx="215" ry="58" />
                    <circle cx="105" cy="150" r="55" />
                    <circle cx="175" cy="100" r="62" />
                    <circle cx="280" cy="75" r="72" />
                    <circle cx="385" cy="100" r="60" />
                    <circle cx="462" cy="150" r="52" />
                    {/* بفّات سفلية بارزة تحت الجسم — حافة كرتونية مسنّنة */}
                    <circle cx="150" cy="195" r="38" />
                    <circle cx="245" cy="205" r="42" />
                    <circle cx="335" cy="205" r="42" />
                    <circle cx="420" cy="195" r="36" />
                  </g>
                  {/* طبقة تظليل مسطحة واحدة أسفل الجسم (عمق من غير تدرج) */}
                  <g fill="#e6edf8" opacity="0.8">
                    <ellipse cx="170" cy="198" rx="85" ry="17" />
                    <ellipse cx="395" cy="200" rx="92" ry="17" />
                    <ellipse cx="280" cy="208" rx="130" ry="15" />
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
