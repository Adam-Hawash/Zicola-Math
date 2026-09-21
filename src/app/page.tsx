'use client'

import { useAppStore } from '@/stores/app-store'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { StudentPendingView } from '@/components/landing/StudentPendingView'
import { StudentPaymentView } from '@/components/landing/StudentPaymentView'
import { LoginView, RegisterView } from '@/components/landing/AuthPages'
import dynamic from 'next/dynamic'
import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'

/* ===== (و73) قطع البازل الأربع لشاشة التحميل — كل قطعة مربع 100×100
   بسنّ (knob) بارزة وفجوة (socket) غاطسة عشان تتشبك مع بعضها في مربع 2×2.
   الألوان: سماوي/عنبري/زمردي/وردي — هوية جديدة مختلفة عن الكحلي+الدهبي القديم.
   رسمة واحدة لكل قطعة بإحداثيات مطلقة جوه viewBox ‏200×200 (المربع المجمّع)،
   وترتيب الرسم (BR→BL→TR→TL) بيخلي السنون تظهر فوق الفجوات = شكل تشابك حقيقي */
var PZ_BR = 'M100,100 H136 C128,100 128,114 150,114 C172,114 172,100 164,100 H200 V200 H100 V164 C100,172 114,172 114,150 C114,128 100,128 100,136 V100 Z'
var PZ_BL = 'M0,100 H36 C28,100 28,114 50,114 C72,114 72,100 64,100 H100 V136 C100,128 114,128 114,150 C114,172 100,172 100,164 V200 H0 Z'
var PZ_TR = 'M100,0 H200 V100 H164 C172,100 172,114 150,114 C128,114 128,100 136,100 H100 V64 C100,72 114,72 114,50 C114,28 100,28 100,36 V0 Z'
var PZ_TL = 'M0,0 H100 V36 C100,28 114,28 114,50 C114,72 100,72 100,64 V100 H64 C72,100 72,114 50,114 C28,114 28,100 36,100 H0 Z'

const HeroSection = dynamic(() => import('@/components/landing/HeroSection'), {
  loading: () => <div className="min-h-[70vh] bg-background" />,
})
const FeaturesGuideSection = dynamic(() => import('@/components/landing/FeaturesGuideSection'), {
  loading: () => <div className="h-20" />,
})
const FeaturesSection = dynamic(() => import('@/components/landing/FeaturesSection').then(function(m) { return { default: m.FeaturesSection } }), {
  loading: () => <div className="h-20" />,
})
const GradesSection = dynamic(() => import('@/components/landing/GradesSection').then(function(m) { return { default: m.GradesSection } }), {
  loading: () => <div className="h-20" />,
})
/* (2026-و29) قسم الأوائل اتشال من الصفحة الرئيسية بطلب المستر — بقى زرار
   «أوائل الطلبة» في النافبار يفتح دايلوج بأول 3 طلاب (TopStudentsDialog) */
/* (و70) قسم النصايح اتشال من الرئيسية بطلب المستر — والتسمية اتغيرت لـ The Scholar */
const GallerySection = dynamic(() => import('@/components/landing/GallerySection'), {
  loading: () => <div className="h-20" />,
})
/* (و70) الفيديو التعريفي في الأعلى + قسم التحديات (طلب المستر حرفيًا) */
const IntroVideoSection = dynamic(() => import('@/components/landing/IntroVideoSection'), {
  loading: () => <div className="h-20" />,
})
const ChallengesSection = dynamic(() => import('@/components/landing/ChallengesSection'), {
  loading: () => <div className="h-20" />,
})
const LessonsSection = dynamic(() => import('@/components/landing/LessonsSection'), {
  loading: () => <div className="h-20" />,
  ssr: false,
})
const WhatsAppButton = dynamic(() => import('@/components/landing/WhatsAppButton').then(m => ({ default: m.WhatsAppButton })), {
  ssr: false,
})
const FloatingLoginButton = dynamic(() => import('@/components/landing/FloatingLoginButton').then(function(m) { return { default: m.FloatingLoginButton } }), {
  ssr: false,
})
const VideoProtection = dynamic(() => import('@/components/landing/VideoProtection').then(m => ({ default: m.VideoProtection })), {
  ssr: false,
})
const StudentPortal = dynamic(() => import('@/components/student/StudentPortal').then(m => ({ default: (m as any).default || m.StudentPortal })), {
  loading: () => <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>,
})
const ParentPortal = dynamic(() => import('@/components/parent/ParentPortal').then(m => ({ default: (m as any).ParentPortal })), {
  loading: () => <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>,
})
const ParentLoginView = dynamic(() => import('@/components/parent/ParentAuthPages').then(m => ({ default: m.ParentLoginView })), {
  loading: () => <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>,
})
const ParentRegisterView = dynamic(() => import('@/components/parent/ParentAuthPages').then(m => ({ default: m.ParentRegisterView })), {
  loading: () => <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>,
})
const AdminDashboard = dynamic(() => import('@/components/admin/AdminDashboard').then(m => ({ default: (m as any).default || m.AdminDashboard })), {
  loading: () => <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>,
})

// Minimum loading screen duration (ms)
// (2026-و30) طلب المستر: «لما يجي يدخل الطفل الأولاني بيقعد وقت — سرّعه»
// كان 2000ms انتظار إجباري حتى لو البيانات وصلت — بقى 600ms بس (نفس
// الوظيفة: منع وميض المحتوى غير المُبراند) والدخول بقى فوري تقريبًا
var MIN_LOADING_MS = 600
// Maximum loading screen duration - force show content even if APIs fail (ms)
// (2026-و30) كان 5000 — بقى 3000 عشان البوابة ماتعلقش على API بطيء
var MAX_LOADING_MS = 3000

export default function HomePage() {
  var store = useAppStore()
  var currentView = store.currentView || 'landing'
  var setGalleryImages = (store as any).setGalleryImages || function(){}
  var siteConfig = store.siteConfig || {}
  var configLoaded = store.configLoaded
  var setSiteConfig = store.setSiteConfig
  var setConfigLoaded = store.setConfigLoaded
  var setStats = store.setStats

  const [appReady, setAppReady] = useState(false)
  const startTimeRef = useRef(Date.now())

  /* ===== (2026-و39) مفيش استرجاع جلسة تلقائي — طلب المستر الحرفي:
     «الطالب اللي يفتح منصة يفتح عليه على الصفحة الرئيسية اللي فيها صورة
     المستر والحاجات دي وهو يعمل تسجيل دخول بنفسه — ونفس الكلام لولي الأمر».
     الفتح دايمًا على الرئيسية (landing) والدخول يدوي كل مرة.
     mg_student/mg_parent بتتكتب عند الدخول عشان باقي الواجهات تستخدمها
     جوه الجلسة، بس مش بترجّع حد لأي بورتال لوحده.
     حماية شاشة الحل (و38: mg_active_solve + المسودات) شغالة زي ما هي
     وبتتفعل بعد الدخول اليدوي. */

  // Load config + gallery + stats on mount
  useEffect(function() {
    var dataReady = false
    var minTimerDone = false

    // Minimum display timer - ensures loading screen shows for at least 2s
    var minTimer = setTimeout(function() {
      minTimerDone = true
      if (dataReady) setAppReady(true)
    }, MIN_LOADING_MS)

    // Safety timer - force show content after 5s no matter what
    var maxTimer = setTimeout(function() {
      setAppReady(true)
    }, MAX_LOADING_MS)

    Promise.all([
      fetch('/api/config').then(function(r) { return r.json() }).catch(function() { return {} }),
      fetch('/api/gallery').then(function(r) { return r.json() }).catch(function() { return {} }),
      fetch('/api/stats').then(function(r) { return r.json() }).catch(function() { return {} }),
    ]).then(function(results) {
      var cfg = results[0]
      var gal = results[1]
      var sta = results[2]
      if (cfg && cfg.error && cfg.defaults) {
        cfg = cfg.defaults
      }
      if (cfg && !configLoaded) {
        setSiteConfig(cfg)
        setConfigLoaded(true)
      }
      if (gal && gal.images) {
        setGalleryImages(gal.images)
      }
      if (sta && sta.totalStudents !== undefined) {
        setStats(sta)
      }
      dataReady = true
      if (minTimerDone) {
        clearTimeout(maxTimer)
        setAppReady(true)
      }
    })

    return function() {
      clearTimeout(minTimer)
      clearTimeout(maxTimer)
    }
  }, [])

  const showFooter = currentView === 'landing'
  const showWhatsApp = currentView === 'landing' || currentView === 'auth-login' || currentView === 'auth-register'

  // Full-page loading screen
  // (و73) شاشة تحميل جديدة بطلب المستر: قطع بيزك (بازل) ملوّنة بتطير وتدور من
  // الاتجاهات الأربعة وتتجمّع في مربع 2×2 وبتتنفس بهدوء — بدل السحابة البيضاء
  // والقبعة الدهبية. الخلفية كحلي عميق بنفس الاندفاع الفاخر والنصوص:
  // «Mr. Ahmed Shaban» + «ZICOLA IN MATH» (بلون سماوي بدل الدهبي) + سبينر
  if (!appReady) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-hidden flex flex-col items-center justify-center gap-7 bg-[radial-gradient(120%_120%_at_50%_0%,#173f6e_0%,#0f2a55_45%,#071527_100%)]">
        {/* Glow dots — أبيض/أزرق + لمسات بألوان البازل الأربعة */}
        <div className="absolute top-[16%] left-[18%] h-2 w-2 rounded-full bg-white/80 animate-pulse" style={{ boxShadow: '0 0 14px rgba(255,255,255,0.85)' }} />
        <div className="absolute top-[24%] right-[14%] h-1.5 w-1.5 rounded-full bg-[#38bdf8]/80 animate-pulse" style={{ boxShadow: '0 0 12px rgba(56,189,248,0.9)', animationDelay: '0.6s' }} />
        <div className="absolute bottom-[22%] left-[24%] h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" style={{ boxShadow: '0 0 10px rgba(255,255,255,0.7)', animationDelay: '1.1s' }} />
        <div className="absolute bottom-[28%] right-[22%] h-2 w-2 rounded-full bg-[#fbbf24]/70 animate-pulse" style={{ boxShadow: '0 0 14px rgba(251,191,36,0.75)', animationDelay: '0.3s' }} />
        <div className="absolute top-[42%] left-[8%] h-1 w-1 rounded-full bg-[#34d399]/70 animate-pulse" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.7)', animationDelay: '1.5s' }} />
        <div className="absolute top-[38%] right-[9%] h-1 w-1 rounded-full bg-[#fb7185]/70 animate-pulse" style={{ boxShadow: '0 0 8px rgba(251,113,133,0.7)', animationDelay: '0.9s' }} />

        {/* Puzzle pieces — بتطير من الاتجاهات الأربعة وتتجمّع (keyframes في globals.css) */}
        <div className="relative" aria-hidden="true">
          <div className="absolute -inset-12 rounded-full bg-[#38bdf8]/15 blur-2xl animate-pulse" />
          <svg
            viewBox="0 0 200 200"
            className="relative w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] pz-asm drop-shadow-[0_16px_36px_rgba(2,8,23,0.55)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ترتيب الرسم مقصود: اللي بيجرهم آخر واحد عشان السنّ تظهر فوق الفجوات */}
            <g className="pz-piece pz-piece-4">
              <path d={PZ_BR} fill="#fb7185" stroke="#0b1c3d" strokeWidth="5" strokeLinejoin="round" />
            </g>
            <g className="pz-piece pz-piece-3">
              <path d={PZ_BL} fill="#34d399" stroke="#0b1c3d" strokeWidth="5" strokeLinejoin="round" />
            </g>
            <g className="pz-piece pz-piece-2">
              <path d={PZ_TR} fill="#fbbf24" stroke="#0b1c3d" strokeWidth="5" strokeLinejoin="round" />
            </g>
            <g className="pz-piece pz-piece-1">
              <path d={PZ_TL} fill="#38bdf8" stroke="#0b1c3d" strokeWidth="5" strokeLinejoin="round" />
            </g>
          </svg>
        </div>

        <div className="text-center space-y-3">
          <h1 dir="ltr" className="text-3xl font-bold text-white tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
            Mr. Ahmed Shaban
          </h1>
          <p className="text-[#38bdf8] text-sm font-semibold uppercase tracking-[0.25em]">
            Zicola In Math
          </p>
          <div className="flex items-center gap-2.5 justify-center pt-1">
            <Loader2 className="h-4 w-4 animate-spin text-white/70" />
            <p className="text-white/60 text-sm">جاري التحميل...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <VideoProtection />
      <Navbar />

      {currentView === 'landing' && (
        <main className="flex-1">
          <HeroSection />
          {/* (و70) الفيديو التعريفي في الأعلى + قسم التحديات — طلب المستر */}
          <IntroVideoSection />
          <FeaturesGuideSection />
          <FeaturesSection />
          <GradesSection />
          {/* (2026-و29) أفضل 3 طلاب بقوا في النافبار (زرار أوائل الطلبة) بدل الرئيسية
              (و70) زرار أوائل الطلبة اتشال من النافبار بطلب المستر (حاجات الطلاب) */}
          <LessonsSection />
          <ChallengesSection />
          <GallerySection />
        </main>
      )}

      {currentView === 'auth-login' && (
        <main className="flex-1">
          <LoginView />
        </main>
      )}

      {currentView === 'auth-register' && (
        <main className="flex-1">
          <RegisterView />
        </main>
      )}

      {currentView === 'student-pending' && <StudentPendingView />}
      {currentView === 'student-portal' && <StudentPortal />}
      {currentView === 'student-payment' && <StudentPaymentView />}
      {currentView === 'admin-dashboard' && <AdminDashboard />}

      {/* (2026-و37) شاشات ولي الأمر */}
      {currentView === 'parent-login' && (
        <main className="flex-1">
          <ParentLoginView />
        </main>
      )}
      {currentView === 'parent-register' && (
        <main className="flex-1">
          <ParentRegisterView />
        </main>
      )}
      {currentView === 'parent-portal' && <ParentPortal />}

      {showFooter && <Footer />}
      {showWhatsApp && <WhatsAppButton />}
      {showWhatsApp && <FloatingLoginButton />}
    </div>
  )
}
