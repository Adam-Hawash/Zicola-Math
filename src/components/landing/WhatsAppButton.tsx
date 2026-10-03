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
      /* (ص7) طلب المستر: زرار الواتساب يتنزل تحت زي المساعد الذكي بالظبط
         (bottom-5 = 1.25rem) بس الناحية التانية (شمال) — بدل مكانه
         العالي فوق (4.75rem) */
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
      aria-label="تواصل عبر واتساب"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
