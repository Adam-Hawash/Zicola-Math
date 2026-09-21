'use client'

import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
/* (و64) الترجمة الحقيقية عربي/إنجليزي */
import { useT } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { Award, GraduationCap, Users, BookOpen, Clock, CalendarClock } from 'lucide-react'

export default function HeroSection() {
  /* (و64) الترجمة */
  const T = useT()
  const {
    setView,
    siteConfig,
    setSiteConfig,
    configLoaded,
    stats,
  } = useAppStore()

  const [fallbackBgExists, setFallbackBgExists] = useState(false)
  const [fallbackPhotoExists, setFallbackPhotoExists] = useState(false)

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

  useEffect(() => {
    var hasDbBg = !!(siteConfig.hero_bg_image || '')
    var hasDbPhoto = !!(siteConfig.instructor_photo || '')
    if (!hasDbBg) {
      var img = new Image()
      img.onload = function () { setFallbackBgExists(true) }
      img.onerror = function () { setFallbackBgExists(false) }
      img.src = '/images/hero-bg.jpg'
    } else {
      setFallbackBgExists(false)
    }
    if (!hasDbPhoto) {
      /* البراند الجديد: مفيش صورة افتراضية للمعلم — الصورة من لوحة الأدمن بس */
      setFallbackPhotoExists(false)
    } else {
      setFallbackPhotoExists(false)
    }
  }, [siteConfig.hero_bg_image, siteConfig.instructor_photo])

  const dbPhoto = cfg.instructor_photo || ''
  const dbBg = cfg.hero_bg_image || ''
  /* صورة المعلم من قاعدة البيانات (instructor_photo من لوحة الأدمن) — بدون صورة بيظهر أيقونة القبعة */
  const heroPhoto = dbPhoto || ''
  const heroBg = dbBg || '/images/hero-bg.jpg'

  const showBg = !!dbBg || fallbackBgExists
  const showPhoto = !!dbPhoto || fallbackPhotoExists

  return (
    <section className="relative overflow-hidden bg-[#0F0D0A]" dir="rtl">
      {/* Subtle tiny dots + faint math/geometric symbols background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Faint math symbols - very subtle background */}
        <div className="absolute text-[120px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '5%', right: '5%' }}>√</div>
        <div className="absolute text-[90px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '15%', left: '8%' }}>π</div>
        <div className="absolute text-[100px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '50%', left: '5%' }}>∑</div>
        <div className="absolute text-[80px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '65%', right: '10%' }}>∫</div>
        <div className="absolute text-[70px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '85%', left: '15%' }}>∞</div>
        <div className="absolute text-[60px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '25%', right: '40%' }}>a²</div>
        <div className="absolute text-[55px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '70%', left: '40%' }}>b²</div>
        <div className="absolute text-[65px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '40%', right: '8%' }}>Δ</div>
        <div className="absolute text-[50px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '10%', left: '30%' }}>θ</div>
        <div className="absolute text-[75px] font-bold text-white/[0.04] leading-none select-none" style={{ top: '80%', right: '30%' }}>÷</div>

        {/* Geometric shapes - very subtle background */}
        {/* Triangle */}
        <svg className="absolute text-white/[0.05]" style={{ top: '8%', left: '20%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 45,45 5,45" />
        </svg>
        {/* Circle */}
        <svg className="absolute text-white/[0.05]" style={{ top: '55%', right: '20%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="25" cy="25" r="20" />
        </svg>
        {/* Square */}
        <svg className="absolute text-white/[0.05]" style={{ top: '78%', left: '40%', width: '45px', height: '45px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="8" y="8" width="34" height="34" />
        </svg>
        {/* Pentagon */}
        <svg className="absolute text-white/[0.05]" style={{ top: '32%', right: '45%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 45,20 38,45 12,45 5,20" />
        </svg>
        {/* Hexagon */}
        <svg className="absolute text-white/[0.05]" style={{ top: '92%', right: '5%', width: '55px', height: '55px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="25,5 42,15 42,35 25,45 8,35 8,15" />
        </svg>
        {/* Right triangle */}
        <svg className="absolute text-white/[0.05]" style={{ top: '45%', left: '48%', width: '50px', height: '50px' }} viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5,45 45,45 5,5" />
          <path d="M 5,15 L 15,15 L 15,45" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>

        {/* 18 dots - professional scattered layout with subtle glow */}
        {/* Top section */}
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '8%', right: '15%', background: '#a78bfa', boxShadow: '0 0 4px #a78bfa' }} />
        <div className="hero-dot hero-dot-2 w-1 h-1 rounded-full" style={{ top: '12%', left: '25%', background: '#fb7185', boxShadow: '0 0 4px #fb7185' }} />
        <div className="hero-dot hero-dot-3 w-1 h-1 rounded-full" style={{ top: '20%', right: '40%', background: '#34d399', boxShadow: '0 0 4px #34d399' }} />
        <div className="hero-dot hero-dot-4 w-1 h-1 rounded-full" style={{ top: '6%', left: '55%', background: '#fbbf24', boxShadow: '0 0 4px #fbbf24' }} />

        {/* Upper middle */}
        <div className="hero-dot hero-dot-5 w-1 h-1 rounded-full" style={{ top: '28%', right: '8%', background: '#60a5fa', boxShadow: '0 0 4px #60a5fa' }} />
        <div className="hero-dot hero-dot-6 w-1 h-1 rounded-full" style={{ top: '32%', left: '15%', background: '#f472b6', boxShadow: '0 0 4px #f472b6' }} />
        <div className="hero-dot hero-dot-7 w-1 h-1 rounded-full" style={{ top: '38%', right: '35%', background: '#22d3ee', boxShadow: '0 0 4px #22d3ee' }} />
        <div className="hero-dot hero-dot-8 w-1 h-1 rounded-full" style={{ top: '25%', left: '45%', background: '#a3e635', boxShadow: '0 0 4px #a3e635' }} />

        {/* Middle */}
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '48%', left: '8%', background: '#c084fc', boxShadow: '0 0 4px #c084fc' }} />
        <div className="hero-dot hero-dot-3 w-1 h-1 rounded-full" style={{ top: '52%', right: '20%', background: '#fb923c', boxShadow: '0 0 4px #fb923c' }} />
        <div className="hero-dot hero-dot-5 w-1 h-1 rounded-full" style={{ top: '45%', left: '55%', background: '#818cf8', boxShadow: '0 0 4px #818cf8' }} />

        {/* Lower middle */}
        <div className="hero-dot hero-dot-2 w-1 h-1 rounded-full" style={{ top: '65%', right: '10%', background: '#2dd4bf', boxShadow: '0 0 4px #2dd4bf' }} />
        <div className="hero-dot hero-dot-4 w-1 h-1 rounded-full" style={{ top: '70%', left: '20%', background: '#f87171', boxShadow: '0 0 4px #f87171' }} />
        <div className="hero-dot hero-dot-6 w-1 h-1 rounded-full" style={{ top: '75%', right: '30%', background: '#facc15', boxShadow: '0 0 4px #facc15' }} />
        <div className="hero-dot hero-dot-8 w-1 h-1 rounded-full" style={{ top: '62%', left: '45%', background: '#e879f9', boxShadow: '0 0 4px #e879f9' }} />

        {/* Bottom */}
        <div className="hero-dot hero-dot-7 w-1 h-1 rounded-full" style={{ top: '88%', right: '15%', background: '#60a5fa', boxShadow: '0 0 4px #60a5fa' }} />
        <div className="hero-dot hero-dot-1 w-1 h-1 rounded-full" style={{ top: '92%', left: '35%', background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />
      </div>

      {/* Banner Image at Top */}
      {showBg && (
        <div className="relative w-full">
          <img
            src={heroBg}
            alt="The Scholar in Math Banner"
            className="w-full h-auto max-h-[360px] object-cover object-center"
          />
        </div>
      )}

      {/* Ambient light effects - only in dark mode */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 right-20 h-96 w-96 rounded-full bg-[#C49A38]/10 blur-[100px] dark:block hidden" />
        <div className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-[#C49A38]/5 blur-[80px] dark:block hidden" />
        <div className="absolute top-16 left-10 text-[#C49A38]/10 text-6xl font-light select-none hidden lg:block dark:block">
          a2+b2=c2
        </div>
        <div className="absolute bottom-32 right-16 text-[#C49A38]/8 text-5xl font-light select-none hidden lg:block dark:block">
          f(x)
        </div>
        <div className="absolute top-1/2 left-1/3 text-[#C49A38]/6 text-4xl font-light select-none hidden xl:block dark:block">
          sum int pi
        </div>
      </div>

      {/* Subtle gradient when no banner */}
      {!showBg && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F0D0A] via-[#1A1714] to-[#0F0D0A] -z-10" />
      )}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Text Content */}
          <div className="space-y-6 text-center lg:text-right order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#C49A38]/15 px-4 py-1.5 text-sm font-medium text-[#E5BE5A] border border-[#C49A38]/20">
              <Award className="h-4 w-4" />
              <span>
                {cfg.hero_badge ||
                  'Comprehensive Learning Platform | منصة تعليمية متكاملة'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-white">
              <span className="block text-[#E5BE5A]">
                {cfg.hero_title_line1 || 'The Scholar'}
              </span>
              {/* (و70) «by مستر أحمد شعبان» — LTR عشان «by» تفضل قبل الاسم زي ما المستر كتبها */}
              <span dir="ltr" className="block mt-1 text-2xl sm:text-3xl lg:text-4xl font-semibold text-white/80">
                {cfg.hero_title_line2 || 'by مستر أحمد شعبان'}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl text-white/70 text-base sm:text-lg leading-relaxed lg:mx-0 mx-auto">
              {cfg.hero_subtitle ||
                T('نبسّط لك الرياضيات ونجعلها سهلة وممتعة! Algebra, Geometry, Formulas, Cheat Sheets — واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة لتقدّمك الأكاديمي.',
                  'We make math simple and fun! Algebra, Geometry, Formulas, Cheat Sheets — weekly homework, regular exams, and continuous tracking of your progress.')}
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
                className="text-base px-8 py-6 min-h-[44px] border-[#C49A38]/40 text-[#E5BE5A] hover:bg-[#C49A38]/10 hover:text-[#E5BE5A] transition-colors duration-200"
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
                مواعيد السنتر
              </Button>
            </div>

            {/* Hero Developer / Adam Hawash branding */}
            <div className="pt-4 flex flex-col items-center lg:items-start gap-1">
              <a
                href={cfg.hero_developer_url || 'https://prime-developer-portfolio-11.vercel.app'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-white/60 hover:text-primary transition-colors"
              >
                {cfg.hero_developer_label || 'Hero Developer'}
              </a>
              <div className="h-px w-16 bg-white/10" />
              <a
                href={cfg.hero_developer_url || 'https://prime-developer-portfolio-11.vercel.app'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 font-light tracking-wider hover:text-primary transition-colors"
              >
                {cfg.footer_made_by_label || 'Developed by Adam Hawash'}
              </a>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center lg:justify-start gap-8 pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <BookOpen className="h-4 w-4 text-[#8B6914]/60 dark:text-[#E5BE5A]/60" />
                  <p className="text-2xl font-bold text-[#E5BE5A]">
                    {stats?.totalVideos
                      ? stats.totalVideos
                      : cfg.hero_stat1_value || '100+'}
                  </p>
                </div>
                <p className="text-xs text-white/70">
                  {cfg.hero_stat1_label || 'Video Lessons | دروس فيديو'}
                </p>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="h-4 w-4 text-[#8B6914]/60 dark:text-[#E5BE5A]/60" />
                  <p className="text-2xl font-bold text-[#E5BE5A]">
                    {stats?.approvedStudents
                      ? stats.approvedStudents
                      : cfg.hero_stat2_value || '500+'}
                  </p>
                </div>
                <p className="text-xs text-white/70">
                  {cfg.hero_stat2_label || 'Students | طالب'}
                </p>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="h-4 w-4 text-[#8B6914]/60 dark:text-[#E5BE5A]/60" />
                  <p className="text-2xl font-bold text-[#E5BE5A]">
                    {cfg.hero_stat3_value || '24/7'}
                  </p>
                </div>
                <p className="text-xs text-white/70">
                  {cfg.hero_stat3_label || 'Tracking | متابعة'}
                </p>
              </div>
            </div>
          </div>

          {/* Instructor Photo - Square shape with elegant frame */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-2 -mt-4 sm:-mt-8">
            <div className="relative group">
              {/* Gold ambient glow */}
              <div className="absolute -inset-3 bg-gradient-to-br from-[#C49A38]/30 dark:from-[#E5BE5A]/40 via-[#C49A38]/15 to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-90" />
              {/* Decorative dotted frame */}
              <svg className="absolute -top-6 -left-6 w-20 h-20 opacity-50 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#C49A38" strokeWidth="2.5" strokeDasharray="3 7" />
              </svg>
              <svg className="absolute -bottom-6 -right-6 w-16 h-16 opacity-40 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#C49A38" strokeWidth="2.5" strokeDasharray="3 7" />
              </svg>
              {/* (و70) صورة المستر طالع من السحابة — بتتعرض كاملة بأبعادها الطبيعية
                  (landscape) زيها بالظبط من غير قص + تحميل فوري */}
              <div className="relative w-72 sm:w-80 lg:w-[26rem] rounded-2xl overflow-hidden border-2 border-[#C49A38]/40 gold-glow bg-transparent shadow-2xl">
                {showPhoto ? (
                  <img
                    src={heroPhoto}
                    alt={cfg.instructor_name || 'مستر أحمد شعبان'}
                    width={853}
                    height={549}
                    loading="eager"
                    fetchPriority="high"
                    className="w-full h-auto object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-[#C49A38]/30">
                    <GraduationCap className="h-24 w-24" />
                  </div>
                )}
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
              {/* Badge overlay — الاسم مرة واحدة بس (طلب المستر) */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#0F0D0A] border border-[#C49A38]/40 rounded-full px-5 py-2 shadow-lg">
                <p className="text-[#E5BE5A] font-bold text-sm tracking-wider whitespace-nowrap">
                  {cfg.instructor_name || 'مستر أحمد شعبان'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
