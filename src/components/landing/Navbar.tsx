'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/stores/app-store'
import {
  LogOut,
  UserPlus,
  LogIn,
  Menu,
  X,
  Loader2,
  LayoutDashboard,
  Shield,
  Youtube,
  Shapes,
  CalendarClock,
} from 'lucide-react'
import { toast } from 'sonner'
/* (و64) زرار الثيم الموحد (و73: زرار اللغة القديم اتشال من هنا وبقى حبة EN | عربي زي منصة د. شيماء) */
import { ThemeToggle } from '@/components/platform-toggles'
/* (و72) النافبار كله إنجليزي ثابت مهما كانت اللغة — والموقع نفسه بيفضل ثنائي */
import { useLangStore, pickConfig } from '@/lib/i18n'
/* (و70) زرار «أوائل الطلبة» اتشال من النافبار بطلب المستر (حاجات الطلاب) */

/* (و73) سويتش اللغة بشكل حبة (pill) — نفس تصميم منصة د. شيماء بالظبط —
   EN | عربي — بيقرأ/يكتب ستور اللغة الموحد (useLangStore) فيقلّب النصوص
   واتجاه الصفحة (rtl/ltr) والاختيار محفوظ في localStorage زي باقي المنصة */
function LangPillToggle() {
  var lang = useLangStore(function (s) { return s.lang })
  var setLang = useLangStore(function (s) { return s.setLang })
  return (
    <div
      className="inline-flex items-center rounded-full border border-border bg-muted/60 p-0.5 text-[11px] font-bold"
      role="group"
      aria-label="Language / اللغة"
    >
      <button
        type="button"
        onClick={function () { setLang('en') }}
        aria-pressed={lang === 'en'}
        className={'rounded-full px-2.5 py-1 transition-colors cursor-pointer ' + (lang === 'en' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
      >
        EN
      </button>
      <button
        type="button"
        onClick={function () { setLang('ar') }}
        aria-pressed={lang === 'ar'}
        className={'rounded-full px-2.5 py-1 transition-colors cursor-pointer ' + (lang === 'ar' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
      >
        عربي
      </button>
    </div>
  )
}

export function Navbar() {
  const [mobileMenu, setMobileMenu] = useState(false)
  /* (2026-و29) دايلوج أوائل الطلبة */
  /* (و71) اسم النافيبار حسب اللغة (الأدمن يكتب عربي/إنجليزي) */
  var lang = useLangStore(function (s) { return s.lang })

  const {
    currentView,
    setView,
    showAdminLogin,
    setShowAdminLogin,
    currentStudent,
    currentAdmin,
    isAdminLoggedIn,
    setCurrentAdmin,
    setAdminLoggedIn,
    logout,
    siteConfig,
  } = useAppStore()

  const cfg = siteConfig
  /* (و70) صورة النافيبار = صورة المستر الرسمية (navbar_photo) — مستقلة عن
     صورة الهيرو (instructor_photo) بطلب المستر: نافيبار بصورته الرسمية */
  const instructorPhoto = cfg.navbar_photo || cfg.instructor_photo || ''
  const youtubeLink = cfg.social_youtube || ''
  // اسم المنصة جنب صورة المستر — "Zicola In Math" (طلب المستر و72: البراند
  // الجديد للنافيبار بالإنجليزي في الاتجاهين، وبيفضل config-driven من لوحة الأدمن)
  const navName = pickConfig(cfg, 'navbar_brand', lang, 'Zicola In Math', 'Zicola In Math')

  const isAuthenticated = !!currentStudent || isAdminLoggedIn
  const isAuthPage = currentView === 'auth-login' || currentView === 'auth-register'

  const handleLogout = () => {
    logout()
    setMobileMenu(false)
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const handleGoHome = () => {
    if (currentAdmin && isAdminLoggedIn) return
    setView('landing')
    setMobileMenu(false)
  }

  const handleLoginClick = () => {
    setView('auth-login')
    setMobileMenu(false)
  }

  const handleRegisterClick = () => {
    setView('auth-register')
    setMobileMenu(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        {/* (و43) توقيع المطور فوق النافبار — نص عادي من غير قلب ولا ألوان ولا أيقونات */}
        {currentView === 'landing' && (
          <div className="w-full border-b border-border/50 bg-background/95">
            <a
              href={cfg.hero_developer_url || 'https://prime-developer-portfolio-11.vercel.app'}
              target="_blank"
              rel="noopener noreferrer"
              title="Developer Portfolio"
              className="flex items-center justify-center py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"
            >
              <span dir="ltr">
                {cfg.footer_made_by_label || 'Developed by Adam Hawash'}
              </span>
            </a>
          </div>
        )}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Brand - Right side (RTL start) */}
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 transition-opacity hover:opacity-80 cursor-pointer"
          >
            {instructorPhoto ? (
              <img
                src={instructorPhoto}
                alt="Zicola In Math"
                width={36}
                height={36}
                loading="eager"
                className="h-9 w-9 rounded-lg object-cover border border-primary/30"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-xs font-bold">ZM</span>
              </div>
            )}
            <div className="hidden sm:block">
              {/* Zicola In Math — بالإنجليزي في الاتجاهين (و72) */}
              <h1 dir="ltr" className="text-sm font-bold leading-tight text-foreground whitespace-nowrap">
                {navName}
              </h1>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {/* (و70) زرار أوائل الطلبة اتشال من الديسك توب بطلب المستر (حاجات الطلاب) */}
            {/* Geometry Laws — قوانين الهندسة (طلب المستر: حاجة اسمها بالانجليزي جنب الرئيسية) */}
            <a
              href="/geometry-laws"
              title="Geometry Laws — all geometry laws: areas, perimeters and volumes"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Shapes className="h-4 w-4" />
              Geometry Laws
            </a>
            {/* (و43) مواعيد السنتر اتشالت من النافبار الديسك توب بطلب المستر —
               بتفضل في قايمة الموبايل وصفحة /schedule شغالة زي ما هي */}
            {currentStudent ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Welcome,{' '}
                  <span className="font-semibold text-foreground">
                    {currentStudent.name}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  Logout
                </Button>
              </div>
            ) : isAdminLoggedIn && currentAdmin ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] text-foreground"
                  onClick={() => setView('admin-dashboard')}
                >
                  <LayoutDashboard className="h-4 w-4 ml-1" />
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] bg-card border-border hover:bg-muted text-foreground rounded-xl transition-all duration-200"
                  onClick={handleLoginClick}
                >
                  <LogIn className="h-4 w-4 ml-1" />
                  Login
                </Button>
                <Button
                  size="sm"
                  className="min-h-[44px] bg-[#0F3D3E] hover:bg-[#0a2e2f] dark:bg-[#1e3a5f] dark:hover:bg-[#16294a] text-white rounded-xl transition-all duration-200 shadow-sm"
                  onClick={handleRegisterClick}
                >
                  <UserPlus className="h-4 w-4 ml-1" />
                  Sign Up
                </Button>
              </>
            )}
            {/* (و73) سويتش اللغة الحبة — ظاهر في كل الحالات (زائر/طالب/أدمن)
                جنب أزرار الدخول في الديسكتوب زي منصة د. شيماء */}
            <LangPillToggle />
          </nav>

          {/* YouTube + Theme Toggle + Mobile Menu Button */}
          <div className="flex items-center gap-2">
            {/* (و70) زرار الأوائل في الموبايل اتشال بطلب المستر */}
            {/* Geometry Laws — ظاهر على طول في الموبايل فوق من غير فتح القائمة
                (طلب المستر: «عاوزه يبقى باين في الموبايل»)
                (2026-و29) طلب المستر: الأيقونة لوحدها مش كفاية — اكتبوا Geometry جنبها */}
            <a
              href="/geometry-laws"
              title="Geometry Laws"
              aria-label="Geometry Laws"
              className="md:hidden flex items-center gap-1 min-h-[44px] px-2.5 rounded-xl text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              <Shapes className="h-5 w-5" />
              <span dir="ltr" className="text-xs font-bold">Geometry</span>
            </a>
            {youtubeLink && (
              <a
                href={youtubeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-red-500 transition-colors"
                title="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
            )}

            {/* (و64) زرار الثيم — (و73) اللغة بقت الحبة الجديدة فوق في شريط اللينكات */}
            <ThemeToggle />

            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label={mobileMenu ? 'Close menu' : 'Open menu'}
            >
              {mobileMenu ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-md px-4 py-3 space-y-2">
            {/* (و70) أوائل الطلبة اتشال من قايمة الموبايل بطلب المستر */}
            {/* Geometry Laws — قوانين الهندسة (ظاهر للكل: زائر/طالب/أدمن) */}
            <a
              href="/geometry-laws"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-sm"
            >
              <Shapes className="h-4 w-4" />
              Geometry Laws
            </a>
            {/* (و35) مواعيد السنتر في قايمة الموبايل */}
            <a
              href="/schedule"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-border bg-muted/40 text-foreground font-bold text-sm"
            >
              <CalendarClock className="h-4 w-4" />
              Center Schedule
            </a>
            {currentStudent ? (
              <>
                <p className="text-sm text-muted-foreground py-2">
                  Welcome,{' '}
                  <span className="font-semibold text-foreground">
                    {currentStudent.name}
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  Logout
                </Button>
              </>
            ) : isAdminLoggedIn && currentAdmin ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full min-h-[44px] justify-start text-foreground"
                  onClick={() => {
                    setView('admin-dashboard')
                    setMobileMenu(false)
                  }}
                >
                  <LayoutDashboard className="h-4 w-4 ml-2" />
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px] bg-card border-border hover:bg-muted text-foreground rounded-xl transition-all duration-200"
                  onClick={handleLoginClick}
                >
                  <LogIn className="h-4 w-4 ml-1" />
                  Login
                </Button>
                <Button
                  size="sm"
                  className="w-full min-h-[44px] bg-[#0F3D3E] hover:bg-[#0a2e2f] dark:bg-[#1e3a5f] dark:hover:bg-[#16294a] text-white rounded-xl transition-all duration-200 shadow-sm"
                  onClick={handleRegisterClick}
                >
                  <UserPlus className="h-4 w-4 ml-1" />
                  Sign Up
                </Button>
              </>
            )}

            {/* (و73) سويتش اللغة الحبة في قايمة الموبايل — ظاهر للكل (زائر/طالب/أدمن) */}
            <div className="flex justify-center pt-1">
              <LangPillToggle />
            </div>
          </div>
        )}
      </header>

      {/* (2026-و29) دايلوج أوائل الطلبة — أول 3 طلاب */}
      {/* (و70) دايلوج أوائل الطلبة اتشال بالكامل بطلب المستر (حاجات الطلاب) */}

      {/* Admin Login Dialog - Hidden Entry Point */}
      <AdminLoginDialog />
    </>
  )
}

function AdminLoginDialog() {
  const {
    showAdminLogin,
    setShowAdminLogin,
    setCurrentAdmin,
    setAdminLoggedIn,
    setView,
  } = useAppStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('الرجاء إدخال البريد وكلمة المرور')
      return
    }
    if (loading) return // Prevent double-submit
    setLoading(true)
    setStatusMsg('جاري الاتصال بالسيرفر...')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s hard timeout

    try {
      setStatusMsg('جاري التحقق من البيانات...')
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (res.ok) {
        setStatusMsg('جاري تحميل لوحة التحكم...')
        setCurrentAdmin(data.admin)
        setAdminLoggedIn(true)
        setShowAdminLogin(false)
        setView('admin-dashboard')
        toast.success('مرحباً بك في لوحة التحكم')
      } else {
        toast.error(data.error || 'خطأ في تسجيل الدخول')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.error('انتهت مهلة الاتصال — حاول مرة أخرى')
      } else {
        toast.error('حدث خطأ في الاتصال')
      }
    } finally {
      clearTimeout(timeout)
      setLoading(false)
      setStatusMsg('')
    }
  }

  return (
    <Dialog open={showAdminLogin} onOpenChange={(open) => { if (!loading) setShowAdminLogin(open) }}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            دخول المشرفين
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="admin-dialog-email" className="text-foreground">
              البريد الإلكتروني
            </Label>
            <Input
              id="admin-dialog-email"
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
              dir="ltr"
              className="min-h-[44px]"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-dialog-password" className="text-foreground">
              كلمة المرور
            </Label>
            <Input
              id="admin-dialog-password"
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
              dir="ltr"
              className="min-h-[44px]"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          {statusMsg && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">{statusMsg}</p>
          )}
          <Button
            className="w-full min-h-[44px] font-semibold"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              'دخول لوحة التحكم'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
