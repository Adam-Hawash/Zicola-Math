'use client'

import { useAppStore } from '@/stores/app-store'
import { MessageCircle } from 'lucide-react'

export function WhatsAppButton() {
  var { siteConfig } = useAppStore()
  var cfg = siteConfig
  var whatsappNumber = cfg.whatsapp_number || '201000000000'

  return (
    <a
      href={'https://wa.me/' + whatsappNumber}
      target="_blank"
      rel="noopener noreferrer"
      /* (ص117) طلب المستر: على الموبايل زرار التثبيت العائم مغطي الواتساب —
         الواتساب بيرجع فوق زرار تثبيت التطبيق (4.75rem) زي باقي المنصات
         (نفس قيم Maths-Genius بالظبط — التثبيت تحت 1rem والواتساب فوقه)
         (ص119) طلب المستر: على اللابتوب الواتساب كان عالي فوق — بقى في
         نفس سوا المساعد الذكي بالظبط (bottom-5 زي زرار المساعد) لأن زرار
         التثبيت أصلًا مش بيظهر على اللابتوب (isMobileDevice فقط) */
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-5 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
      aria-label="تواصل عبر واتساب"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
