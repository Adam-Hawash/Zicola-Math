'use client'

import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
/* (و64) الترجمة الحقيقية عربي/إنجليزي */
import { useT, useLangStore } from '@/lib/i18n'
import { useEffect } from 'react'
import { Award, GraduationCap, Users, BookOpen, Clock, CalendarClock } from 'lucide-react'

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
    stats,
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

  /* (و72) صورة المعلم من قاعدة البيانات (instructor_photo من لوحة الأدمن) —
     بدون صورة بيظهر أيقونة القبعة. البانر القديم (hero_bg_image) اتشال من
     الهيرو تمامًا بكل كوده الميت — الهيرو بقى كحلي بالكامل بطلب المستر */
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
      {/* Subtle tiny dots + faint math/geometric symbols background — (و72) retinted white/blue/gold on navy */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Faint math symbols - very subtle background */}
        <div className="absolute text-[120px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '5%', right: '5%' }}>√</div>
        <div className="absolute text-[90px] font-bold text-[#8fb7ff]/[0.08] leading-none select-none" style={{ top: '15%', left: '8%' }}>π</div>
        <div className="absolute text-[100px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '50%', left: '5%' }}>∑</div>
        <div className="absolute text-[80px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '65%', right: '10%' }}>∫</div>
        <div className="absolute text-[70px] font-bold text-[#8fb7ff]/[0.07] leading-none select-none" style={{ top: '85%', left: '15%' }}>∞</div>
        <div className="absolute text-[60px] font-bold text-[#E5BE5A]/[0.08] leading-none select-none" style={{ top: '25%', right: '40%' }}>a²</div>
        <div className="absolute text-[55px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '70%', left: '40%' }}>b²</div>
        <div className="absolute text-[65px] font-bold text-[#E5BE5A]/[0.07] leading-none select-none" style={{ top: '40%', right: '8%' }}>Δ</div>
        <div className="absolute text-[50px] font-bold text-white/[0.05] leading-none select-none" style={{ top: '10%', left: '30%' }}>θ</div>
        <div className="absolute text-[75px] font-bold text-[#8fb7ff]/[0.06] leading-none select-none" style={{ top: '80%', right: '30%' }}>÷</div>

        {/* Geometric shapes - very subtle background */}
        {/* Triangle */}
        <svg className="absolute text-white/[0.07]" style={{ top: '8%', left: '20%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 45,45 5,45" />
        </svg>
        {/* Circle */}
        <svg className="absolute text-white/[0.07]" style={{ top: '55%', right: '20%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="25" cy="25" r="20" />
        </svg>
        {/* Square */}
        <svg className="absolute text-white/[0.07]" style={{ top: '78%', left: '40%', width: '45px', height: '45px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="8" y="8" width="34" height="34" />
        </svg>
        {/* Pentagon */}
        <svg className="absolute text-[#8fb7ff]/[0.08]" style={{ top: '32%', right: '45%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 45,20 38,45 12,45 5,20" />
        </svg>
        {/* Hexagon */}
        <svg className="absolute text-[#8fb7ff]/[0.08]" style={{ top: '92%', right: '5%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 42,15 42,35 25,45 8,35 8,15" />
        </svg>
        {/* Right triangle */}
        <svg className="absolute text-white/[0.07]" style={{ top: '45%', left: '48%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5,45 45,45 5,5" />
          <path d="M 5,15 L 15,15 L 15,45" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>

        {/* 18 dots - professional scattered layout with subtle glow (gold/blue/white on navy) */}
        {/* Top section */}
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '8%', right: '15%', background: '#E5BE5A', boxShadow: '0 0 5px #E5BE5A' }} />
        <div className="hero-dot hero-dot-2 w-1 h-1 rounded-full" style={{ top: '12%', left: '25%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-3 w-1 h-1 rounded-full" style={{ top: '20%', right: '40%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-4 w-1 h-1 rounded-full" style={{ top: '6%', left: '55%', background: '#E5BE5A', boxShadow: '0 0 5px #E5BE5A' }} />

        {/* Upper middle */}
        <div className="hero-dot hero-dot-5 w-1 h-1 rounded-full" style={{ top: '28%', right: '8%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-6 w-1 h-1 rounded-full" style={{ top: '32%', left: '15%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-7 w-1 h-1 rounded-full" style={{ top: '38%', right: '35%', background: '#E5BE5A', boxShadow: '0 0 5px #E5BE5A' }} />
        <div className="hero-dot hero-dot-8 w-1 h-1 rounded-full" style={{ top: '25%', left: '45%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />

        {/* Middle */}
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '48%', left: '8%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-3 w-1 h-1 rounded-full" style={{ top: '52%', right: '20%', background: '#E5BE5A', boxShadow: '0 0 5px #E5BE5A' }} />
        <div className="hero-dot hero-dot-5 w-1 h-1 rounded-full" style={{ top: '45%', left: '55%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />

        {/* Lower middle */}
        <div className="hero-dot hero-dot-2 w-1 h-1 rounded-full" style={{ top: '65%', right: '10%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-4 w-1 h-1 rounded-full" style={{ top: '70%', left: '20%', background: '#E5BE5A', boxShadow: '0 0 5px #E5BE5A' }} />
        <div className="hero-dot hero-dot-6 w-1 h-1 rounded-full" style={{ top: '75%', right: '30%', background: '#ffffff', boxShadow: '0 0 5px rgba(255,255,255,0.9)' }} />
        <div className="hero-dot hero-dot-8 w-1 h-1 rounded-full" style={{ top: '62%', left: '45%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />

        {/* Bottom */}
        <div className="hero-dot hero-dot-7 w-1 h-1 rounded-full" style={{ top: '88%', right: '15%', background: '#8fb7ff', boxShadow: '0 0 5px #8fb7ff' }} />
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '92%', left: '35%', background: '#E5BE5A', boxShadow: '0 0 5px #E5BE5A' }} />
      </div>

      {/* Ambient light effects — (و72) هالات كحلي/دهبي دايمًا ظاهرة على الخلفية الكحلية */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 right-20 h-96 w-96 rounded-full bg-[#3b6db4]/20 blur-[100px]" />
        <div className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-[#C49A38]/10 blur-[80px]" />
        <div className="absolute top-16 left-10 text-[#C49A38]/10 text-6xl font-light select-none hidden lg:block">
          a2+b2=c2
        </div>
        <div className="absolute bottom-32 right-16 text-[#C49A38]/8 text-5xl font-light select-none hidden lg:block">
          f(x)
        </div>
        <div className="absolute top-1/2 left-1/3 text-[#C49A38]/6 text-4xl font-light select-none hidden xl:block">
          sum int pi
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Text Content */}
          <div className="space-y-6 text-center lg:text-right order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#C49A38]/15 px-4 py-1.5 text-sm font-medium text-[#E5BE5A] border border-[#C49A38]/25">
              <Award className="h-4 w-4" />
              <span>
                {L('hero_badge', 'منصة تعليمية متكاملة', 'Comprehensive Learning Platform')}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-white">
              <span className="block text-[#E5BE5A]">
                {L('hero_title_line1', 'The Scholar', 'The Scholar')}
              </span>
              {/* «by مستر أحمد شعبان» — LTR عشان «by» تفضل قبل الاسم */}
              <span dir="ltr" className="block mt-1 text-2xl sm:text-3xl lg:text-4xl font-semibold text-white/80">
                {L('hero_title_line2', 'by مستر أحمد شعبان', 'by Mr. Ahmed Shaban')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-white/75 text-base sm:text-lg leading-relaxed lg:mx-0 mx-auto">
              {L(
                'hero_subtitle',
                'نبسّط لك الرياضيات ونجعلها سهلة وممتعة! Algebra, Geometry, Formulas, Cheat Sheets — واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة لتقدّمك الأكاديمي.',
                'We make math simple and fun! Algebra, Geometry, Formulas, Cheat Sheets — weekly homework, regular exams, and continuous tracking of your academic progress.'
              )}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button
                size="lg"
                className="text-base px-8 py-6 min-h-[44px] bg-[#C49A38] hover:bg-[#D4A843] text-white font-semibold transition-colors duration-200"
                onClick={() => setView('auth-register')}
              >
                {T('اعمل حسابك', 'Create Account')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-6 min-h-[44px] border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors duration-200"
                onClick={() => setView('auth-login')}
              >
                {T('عندك حساب؟ ادخل هنا', 'Have an account? Log in')}
              </Button>
            </div>

            {/* Schedule Button - مواعيد السنتر */}
            <div className="pt-2 flex justify-center lg:justify-start">
              <Button
                variant="outline"
                size="lg"
                className="text-sm px-6 py-4 min-h-[44px] border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors duration-200 gap-2"
                onClick={() => window.location.href = '/schedule'}
              >
                <CalendarClock className="h-4 w-4" />
                {T('مواعيد السنتر', 'Center Schedule')}
              </Button>
            </div>

            {/* Hero Developer / Adam Hawash branding */}
            <div className="pt-4 flex flex-col items-center lg:items-start gap-1">
              <a
                href={cfg.hero_developer_url || 'https://prime-developer-portfolio-11.vercel.app'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-white/60 hover:text-[#E5BE5A] transition-colors"
              >
                {cfg.hero_developer_label || 'Hero Developer'}
              </a>
              <div className="h-px w-16 bg-white/10" />
              <a
                href={cfg.hero_developer_url || 'https://prime-developer-portfolio-11.vercel.app'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 font-light tracking-wider hover:text-[#E5BE5A] transition-colors"
              >
                {cfg.footer_made_by_label || 'Developed by Adam Hawash'}
              </a>
            </div>

            {/* Stats Row — (و72) كروت شفافة بيضاء/زرقاء بقيم دهبي واضحة على الكحلي */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-6">
              <div className="text-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <BookOpen className="h-4 w-4 text-[#E5BE5A]/70" />
                  <p className="text-2xl font-bold text-[#E5BE5A]">
                    {stats?.totalVideos
                      ? stats.totalVideos
                      : cfg.hero_stat1_value || '100+'}
                  </p>
                </div>
                <p className="text-xs text-white/70">
                  {L('hero_stat1_label', 'دروس فيديو', 'Video Lessons')}
                </p>
              </div>

              <div className="text-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="h-4 w-4 text-[#E5BE5A]/70" />
                  <p className="text-2xl font-bold text-[#E5BE5A]">
                    {stats?.approvedStudents
                      ? stats.approvedStudents
                      : cfg.hero_stat2_value || '500+'}
                  </p>
                </div>
                <p className="text-xs text-white/70">
                  {L('hero_stat2_label', 'طالب', 'Students')}
                </p>
              </div>

              <div className="text-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="h-4 w-4 text-[#E5BE5A]/70" />
                  <p className="text-2xl font-bold text-[#E5BE5A]">
                    {cfg.hero_stat3_value || '24/7'}
                  </p>
                </div>
                <p className="text-xs text-white/70">
                  {L('hero_stat3_label', 'متابعة', 'Tracking')}
                </p>
              </div>
            </div>
          </div>

          {/* Instructor Photo — (و72) المستر طالع من سحابة حقيقية على خلفية كحلية:
              الصورة كاملة object-contain object-top من غير أي قص، وذيلها بيذوب
              جوه السحابة بماسك CSS، والسحابة SVG layered بتدرّج أبيض وظل ناعم
              تحتها، وبادج الاسم واقف فوق السحابة */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="relative w-64 sm:w-80 lg:w-[420px] mb-6">
              {showPhoto ? (
                <img
                  src={heroPhoto}
                  alt={L('instructor_name', 'مستر أحمد شعبان', 'Mr. Ahmed Shaaban')}
                  width={1024}
                  height={1024}
                  loading="eager"
                  fetchPriority="high"
                  className="relative z-0 w-full h-auto max-h-[420px] sm:max-h-[460px] mx-auto object-contain object-top"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to bottom, black 62%, transparent 96%)',
                    maskImage: 'linear-gradient(to bottom, black 62%, transparent 96%)',
                  }}
                />
              ) : (
                <div className="w-full aspect-square max-h-[420px] sm:max-h-[460px] flex items-center justify-center text-[#E5BE5A]/40">
                  <GraduationCap className="h-24 w-24" />
                </div>
              )}

              {/* السحابة البيضاء الحقيقية — بتغطي ذيل الصورة (z فوق الصورة) */}
              <div className="relative z-10 -mt-14 sm:-mt-20">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 560 190"
                  className="w-full drop-shadow-[0_18px_40px_rgba(2,8,23,0.5)]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="heroCloudGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="55%" stopColor="#f4f7fd" />
                      <stop offset="100%" stopColor="#e3ebf9" />
                    </linearGradient>
                    <filter id="heroCloudShadowBlur" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="10" />
                    </filter>
                  </defs>
                  {/* ظل ناعم عريض تحت السحابة */}
                  <ellipse cx="280" cy="170" rx="252" ry="15" fill="#0a1730" opacity="0.35" filter="url(#heroCloudShadowBlur)" />
                  {/* طبقات السحابة */}
                  <g fill="url(#heroCloudGrad)">
                    <ellipse cx="280" cy="128" rx="262" ry="46" />
                    <circle cx="92" cy="100" r="46" />
                    <circle cx="172" cy="72" r="56" />
                    <circle cx="280" cy="60" r="64" />
                    <circle cx="388" cy="74" r="56" />
                    <circle cx="468" cy="102" r="44" />
                  </g>
                  {/* تظليل خفيف تحت البفّات */}
                  <g fill="#d7e2f4" opacity="0.5">
                    <ellipse cx="200" cy="150" rx="66" ry="16" />
                    <ellipse cx="362" cy="152" rx="76" ry="16" />
                  </g>
                </svg>

                {/* بادج الاسم واقف على السحابة — dark-navy pill بإطار دهبي ونص أبيض */}
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-[#0e2247]/95 border-2 border-[#E5BE5A]/70 rounded-full px-5 sm:px-7 py-2 sm:py-2.5 shadow-[0_10px_30px_rgba(2,8,23,0.6)]">
                    <p dir="auto" className="text-white font-bold text-sm sm:text-base tracking-wide whitespace-nowrap text-center">
                      {L('instructor_name', 'مستر أحمد شعبان', 'Mr. Ahmed Shaaban')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
