'use client'

import { useAppStore } from '@/stores/app-store'
import { LogIn } from 'lucide-react'
import { useState, useEffect } from 'react'

export function FloatingLoginButton() {
  var store = useAppStore()
  var setView = store.setView
  var currentView = store.currentView
  var [mounted, setMounted] = useState(false)

  useEffect(function() {
    setMounted(true)
  }, [])

  if (!mounted) return null
  if (currentView !== 'landing') return null

  return (
    <button
      onClick={function() { setView('auth-login') }}
      /* (ص119) طلب المستر: على الموبايل زرار تسجيل الدخول يبقى **تحت** زرار
         المساعد الذكي (المساعد فوقيه) — المساعد ثابت bottom-5 right-5
         ارتفاعه h-14 (3.5rem) فالزرار بقى تحته مباشرة bottom-[5.25rem]
         وright-5 (محاذاة لنفس الحافة). أما على الشاشات الأكبر يفضل
         جنبه زي ما هو (right-[5.5rem] bottom-7). */
      className="fixed z-50 flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#2563EB] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 text-xs font-semibold bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-5 md:bottom-7 md:right-[5.5rem]"
      aria-label="تسجيل الدخول"
    >
      <LogIn className="h-3.5 w-3.5" />
      <span>تسجيل الدخول</span>
    </button>
  )
}
