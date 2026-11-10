'use client'

/* ============================================================
   (ز20) مزوّد اتجاه Radix — إصلاح «الترتيب المعكوس» في لوحة التحكم
   ============================================================
   المشكلة الحقيقية (تشخيص بالصورة): الصفحة نفسها RTL سليم (العنوان يمين
   والإحصائيات يمين) لكن مكوّنات Radix (التابات/القوائم/الدايلوجات)
   بتطلع dir="ltr" مرشم عليها من المكتبة نفسها — لما ميبقاش
   DirectionProvider بيقرأ Radix الاتجاه من props → context → **ltr
   افتراضي** — فجذر <Tabs> بيتقلب LTR جوه صفحة RTL وشكل التابات
   بيطلع معكوس (الطلاب على الشمال بدل اليمين).
   الحل: DirectionProvider حوالين المنصة كلها بياخد اتجاهه من ستور
   اللغة (نفس مصدر سكريبت الـ head وLangBoot) — بيكوّن:
   • كل التابات/الدروب داون/السيلكت/الدايلوجات بتتبع اتجاه الصفحة بجد
   • التابات بتترسم RTL: «الطلاب» أقصى اليمين زي الأول بالظبط
   (الافتراضي إنجليزي LTR — نفس افتراضي i18n (10-b)) */
import * as React from 'react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { useLangStore } from '@/lib/i18n'

export function RadixDirection({ children }: { children: React.ReactNode }) {
  var lang = useLangStore(function (s: { lang: 'ar' | 'en' }) { return s.lang })
  return (
    <DirectionProvider dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {children}
    </DirectionProvider>
  )
}
