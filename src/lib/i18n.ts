/* ============================================================
   (و64) نظام اللغة — عربي/إنجليزي حقيقي — طلب المستر الحرفي:
   «لما باجي أبدل الإنجليزي بيبقى الكلام هو هو ما بيتبدلش،
    عاوز الكلام يترجم وتظهر للأولوية للإنجليزي»
   - زر واحد في كل المنصة بيقلّب النصوص + اتجاه الصفحة (rtl/ltr)
   - الاختيار محفوظ في localStorage (mg_lang) وبيرجع مع أول تحميل
   ============================================================ */
'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

export type Lang = 'ar' | 'en'

var LANG_KEY = 'mg_lang'

function applyToDocument(l: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = l
  document.documentElement.dir = l === 'en' ? 'ltr' : 'rtl'
}

export function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'ar'
  try {
    var v = window.localStorage.getItem(LANG_KEY)
    if (v === 'en' || v === 'ar') return v
  } catch (e) { /* صامت */ }
  return 'ar'
}

interface LangStore {
  lang: Lang
  setLang: (l: Lang) => void
}

export var useLangStore = create<LangStore>(function () {
  return {
    lang: 'ar',
    setLang: function (l) {
      try { window.localStorage.setItem(LANG_KEY, l) } catch (e) { /* صامت */ }
      applyToDocument(l)
      useLangStore.setState({ lang: l })
    },
  }
})

/* useT — hook الترجمة: بيسجّل في ستور اللغة، فأي تبديل بيعيد رسم
   المكوّن فورًا. الاستخدام: var T = useT(); T('المجتمع', 'Community') */
export function useT() {
  var lang = useLangStore(function (s) { return s.lang })
  return function (ar: string, en: string): string {
    return lang === 'en' ? en : ar
  }
}

/* t — نسخة بدون hook (للكود اللي مش جوه رندر) — مش بيعيد الرسم لوحده */
export function t(ar: string, en: string): string {
  return useLangStore.getState().lang === 'en' ? en : ar
}

export function currentLang(): Lang {
  return useLangStore.getState().lang
}

/* LangBoot — بيركّب مرة واحدة في layout.tsx: بيقرأ اللغة المحفوظة
   ويطبّق dir/lang على <html> بعد أول تحميل (قبل كده سكريبت الـ head
   بيتكفل بالموضوع قبل الرسم عشان مفيش وميض اتجاه غلط) */
export function LangBoot() {
  useEffect(function () {
    var l = readStoredLang()
    applyToDocument(l)
    useLangStore.setState({ lang: l })
  }, [])
  return null
}

/* (و71) اختيار قيمة نصية من كونفيج الأدمن حسب لغة الزائر:
   إنجليزي بقرأ المفتاح *_en (لو الأدمن كاتبه أو فيه افتراضي)،
   عربي بقرأ المفتاح الأساسي — المستر يكتب كل لغة لوحدها من لوحة التحكم */
export function pickConfig(cfg: any, key: string, lang: string, arFallback?: string, enFallback?: string): string {
  if (lang === 'en') {
    var en = cfg ? cfg[key + '_en'] : ''
    if (en && String(en).trim() !== '') return String(en)
    return enFallback || arFallback || ''
  }
  var v = cfg ? cfg[key] : ''
  if (v && String(v).trim() !== '') return String(v)
  return arFallback || ''
}
