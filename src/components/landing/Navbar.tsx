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
  Trophy,
  CalendarClock,
} from 'lucide-react'
import { toast } from 'sonner'
/* (و64) زراير الثيم + اللغة الموحدة في كل المنصة + الترجمة الحقيقية */
import { PlatformToggles } from '@/components/platform-toggles'
import { useT } from '@/lib/i18n'
/* (2026-و29) «أوائل الطلبة» في النافبار — طلب المستر: زرار جنب Geometry
   يفتح دايلوج بأول 3 طلاب — والقسم اتشال من الصفحة الرئيسية */
import { TopStudentsDialog } from './TopStudentsDialog'

export function Navbar() {
  const [mobileMenu, setMobileMenu] = useState(false)
  /* (2026-و29) دايلوج أوائل الطلبة */
  const [topStudentsOpen, setTopStudentsOpen] = useState(false)
  /* (و64) الترجمة الحقيقية — عربي/إنجليزي */
  const T = useT()

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
  const instructorPhoto = cfg.instructor_photo || ''
  const youtubeLink = cfg.social_youtube || ''
  // اسم المنصة جنب صورة المستر — "Zicola Math" بالإنجليزي (طلب المستر حرفيًا:
  // "انت كتبلي مستر بالعربي — لا، عايزك تكتبلي ماث جينيس بالانجليزي زي المكتوب في المنصة")
  const navName = cfg.navbar_brand || 'Zicola Math'

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
                alt="Zicola Math"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover border border-primary/30"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-xs font-bold">ZM</span>
              </div>
            )}
            <div className="hidden sm:block">
              {/* Zicola Math — بالإنجليزي زي اسم المنصة (طلب المستر) */}
              <h1 dir="ltr" className="text-sm font-bold leading-tight text-foreground whitespace-nowrap">
                {navName}
              </h1>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {/* (2026-و32) أوائل الطلبة أول عنصر — طلب المستر: «في منصات مش شيماء تبقى هي الاولانيه برده» */}
            <button
              type="button"
              onClick={function () { setTopStudentsOpen(true) }}
              title="أوائل الطلبة — أفضل 3 طلاب"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-[#8A6D22] dark:text-[#E5BE5A] hover:bg-[#C49A38]/10 transition-colors cursor-pointer"
            >
              <Trophy className="h-4 w-4" />
              {T('أوائل الطلبة', 'Top Students')}
            </button>
            {/* Geometry Laws — قوانين الهندسة (طلب المستر: حاجة اسمها بالانجليزي جنب الرئيسية) */}
            <a
              href="/geometry-laws"
              title="Geometry Laws — كل قوانين الهندسة: مساحات ومحيطات وحجوم"
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
                  {T('مرحباً', 'Welcome')},{' '}
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
                  {T('خروج', 'Logout')}
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
                  {T('لوحة التحكم', 'Dashboard')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  {T('خروج', 'Logout')}
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
                  {T('سجل دخولك', 'Login')}
                </Button>
                <Button
                  size="sm"
                  className="min-h-[44px] bg-[#0F3D3E] hover:bg-[#0a2e2f] dark:bg-[#1e3a5f] dark:hover:bg-[#16294a] text-white rounded-xl transition-all duration-200 shadow-sm"
                  onClick={handleRegisterClick}
                >
                  <UserPlus className="h-4 w-4 ml-1" />
                  {T('اعمل حساب', 'Sign Up')}
                </Button>
              </>
            )}
          </nav>

          {/* YouTube + Theme Toggle + Mobile Menu Button */}
          <div className="flex items-center gap-2">
            {/* (2026-و32) «أوائل الطلبة» أول عنصر في الموبايل — طلب المستر: في منصات مش شيماء تبقى الأولى */}
            <button
              type="button"
              onClick={function () { setTopStudentsOpen(true) }}
              title="أوائل الطلبة — أفضل 3"
              aria-label="أوائل الطلبة — أفضل 3 طلاب"
              className="md:hidden flex items-center gap-1 min-h-[44px] px-2.5 rounded-xl text-[#8A6D22] dark:text-[#E5BE5A] bg-[#C49A38]/10 border border-[#C49A38]/40 hover:bg-[#C49A38]/20 transition-colors cursor-pointer"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs font-bold">الأوائل</span>
            </button>
            {/* Geometry Laws — ظاهر على طول في الموبايل فوق من غير فتح القائمة
                (طلب المستر: «عاوزه يبقى باين في الموبايل»)
                (2026-و29) طلب المستر: الأيقونة لوحدها مش كفاية — اكتبوا Geometry جنبها */}
            <a
              href="/geometry-laws"
              title="Geometry Laws — قوانين الهندسة"
              aria-label="Geometry Laws — قوانين الهندسة"
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

            {/* (و64) زراير الثيم + اللغة — موحدة في كل المنصة */}
            <PlatformToggles />

            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label={mobileMenu ? 'إغلاق القائمة' : 'فتح القائمة'}
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
            {/* (2026-و32) أوائل الطلبة أول عنصر في قايمة الموبايل — طلب المستر */}
            <button
              type="button"
              onClick={function () { setMobileMenu(false); setTopStudentsOpen(true) }}
              className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[#C49A38]/40 bg-[#C49A38]/10 text-[#8A6D22] dark:text-[#E5BE5A] font-bold text-sm cursor-pointer"
            >
              <Trophy className="h-4 w-4" />
              {T('أوائل الطلبة', 'Top Students')}
            </button>
            {/* Geometry Laws — قوانين الهندسة (ظاهر للكل: زائر/طالب/أدمن) */}
            <a
              href="/geometry-laws"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-sm"
            >
              <Shapes className="h-4 w-4" />
              Geometry Laws — قوانين الهندسة
            </a>
            {/* (و35) مواعيد السنتر في قايمة الموبايل */}
            <a
              href="/schedule"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-border bg-muted/40 text-foreground font-bold text-sm"
            >
              <CalendarClock className="h-4 w-4" />
              {T('مواعيد السنتر — جدول الحصص', 'Center Schedule')}
            </a>
            {currentStudent ? (
              <>
                <p className="text-sm text-muted-foreground py-2">
                  {T('مرحباً', 'Welcome')},{' '}
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
                  {T('خروج', 'Logout')}
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
                  {T('لوحة التحكم', 'Dashboard')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  {T('خروج', 'Logout')}
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
                  {T('سجل دخولك', 'Login')}
                </Button>
                <Button
                  size="sm"
                  className="w-full min-h-[44px] bg-[#0F3D3E] hover:bg-[#0a2e2f] dark:bg-[#1e3a5f] dark:hover:bg-[#16294a] text-white rounded-xl transition-all duration-200 shadow-sm"
                  onClick={handleRegisterClick}
                >
                  <UserPlus className="h-4 w-4 ml-1" />
                  {T('اعمل حساب', 'Sign Up')}
                </Button>
              </>
            )}
          </div>
        )}
      </header>

      {/* (2026-و29) دايلوج أوائل الطلبة — أول 3 طلاب */}
      <TopStudentsDialog open={topStudentsOpen} onOpenChange={setTopStudentsOpen} />

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
