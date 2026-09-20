'use client'

/* ============================================================
   (و64) زراير عامة في كل المنصة — طلب المستر:
   1) الإضاءة الليلية والنهارية — «عايزك تعمله لي، بس يكون على الإضاءة
      الليلية والنهارية ويكون شغال وتحطه في كل المنصات» — نفس شكل
      زرار النافبار بس متاح في كل الصفحات (بورتال الطالب/الأدمن/ولي الأمر)
   2) تبديل اللغة عربي/إنجليزي — وبيترجم فعلًا (شوف lib/i18n.ts)
   ============================================================ */

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLangStore } from '@/lib/i18n'

var emptySubscribe = function () { return function () {} }
function useMounted() {
  return useSyncExternalStore(emptySubscribe, function () { return true }, function () { return false })
}

/* زرار الإضاءة — شمس/قمر حسب الوضع الحالي */
export function ThemeToggle() {
  var mounted = useMounted()
  var themeRaw = useTheme()
  var theme = themeRaw.theme
  var setTheme = themeRaw.setTheme

  if (!mounted) {
    /* نفس المقاس لحد ما الجاهزية تتحسم — منع اختلاف الـ hydration */
    return <div className="h-9 w-9 shrink-0" aria-hidden="true" />
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={function () { setTheme(theme === 'dark' ? 'light' : 'dark') }}
      title="الإضاءة الليلية والنهارية | Dark / Light mode"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

/* زرار اللغة — في الوضع العربي بيعرض EN (يدوس يروح إنجليزي)
   وفي الإنجليزي بيعرض عربي (يرجع) — والتبديل بيترجم فعلًا وبيقلب الاتجاه */
export function LangToggle() {
  var lang = useLangStore(function (s) { return s.lang })
  var setLang = useLangStore(function (s) { return s.setLang })

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 min-h-[36px] px-2.5 gap-1 shrink-0 text-xs font-bold"
      onClick={function () { setLang(lang === 'en' ? 'ar' : 'en') }}
      title="تغيير اللغة | Change language"
      aria-label="تغيير اللغة | Change language"
    >
      <Languages className="h-4 w-4" />
      {lang === 'en' ? 'عربي' : 'EN'}
    </Button>
  )
}

/* الاتنين جاهزين جنب بعض — للحاجة في أي هيدر */
export function PlatformToggles() {
  return (
    <div className="flex items-center gap-1.5">
      <ThemeToggle />
      <LangToggle />
    </div>
  )
}
