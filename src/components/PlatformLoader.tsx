/* ============================================================
   PlatformLoader — لودر «Zicola In Math» (2026-و96)
   ============================================================
   تعديل المستر الحرفي: «شيل الكبعة دي — خليها اللودينج الدوارة
   العادية بس، ونكتب تحتها في سطر صغير بنحمل بياناتك»
   + «شيل كلمة مستر أحمد شعبان — خليها اللي هي المكتوبة بس».
   • سبنر دوّار عادي (من غير المدارات والنواة الكبيرة)
   • اسم المنصة المكتوب «Zicola In Math» بس — من غير اسم المستر
   • 3 أنماط: full (شاشة كاملة) / inline (جوه سيكشن) / compact (صغير)
   ============================================================ */

import React from 'react'

type PlatformLoaderProps = {
  variant?: 'full' | 'inline' | 'compact'
  /** نص اختاري تحت اللودر */
  label?: string
  className?: string
}

/* (2026-و96) اللودينج الدوارة العادية — حلقة بيلف حوافها، بسيطة ونضيفة */
function Spinner({ size, thickness }: { size: number; thickness?: number }) {
  return (
    <span
      className="pl-spin"
      style={{ width: size, height: size, borderWidth: thickness || Math.max(3, Math.round(size / 16)) }}
      aria-hidden="true"
    />
  )
}

/* اسم المنصة المكتوب — من غير «مستر أحمد شعبان» بطلب المستر */
function Wordmark() {
  return (
    <div className="text-center">
      <h1 className="pl-wordmark text-3xl sm:text-4xl font-black tracking-wide" dir="ltr">
        Zicola In Math
      </h1>
    </div>
  )
}

export function PlatformLoader({ variant = 'inline', label, className }: PlatformLoaderProps) {
  const style = <PlatformLoaderStyle />

  /* ===== شاشة كاملة — بوت المنصة ===== */
  if (variant === 'full') {
    return (
      <>
        {style}
        <div className={'fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center gap-6 ' + (className || '')} role="status" aria-live="polite">
          <Wordmark />
          <Spinner size={64} />
          <p className="text-muted-foreground text-sm">{label || 'بنحمل بياناتك...'}</p>
        </div>
      </>
    )
  }

  /* ===== سطر صغير — جوه الكروت والحالات الجانبية ===== */
  if (variant === 'compact') {
    return (
      <>
        {style}
        <div className={'flex items-center justify-center gap-3 py-6 ' + (className || '')} role="status" aria-live="polite">
          <Spinner size={28} />
          {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
        </div>
      </>
    )
  }

  /* ===== inline — بلوك جوه السيكشن ===== */
  return (
    <>
      {style}
      <div className={'flex flex-col items-center justify-center gap-4 py-14 ' + (className || '')} role="status" aria-live="polite">
        <Spinner size={52} />
        {label ? <p className="text-muted-foreground text-sm font-medium">{label}</p> : null}
      </div>
    </>
  )
}

/* ===== الستايل — ذاتي بالكامل (مفيش تعديل على globals.css) ===== */
function PlatformLoaderStyle() {
  return (
    <style>{`
      .pl-spin {
        display: inline-block; border-radius: 9999px;
        border-style: solid; border-color: rgba(59,121,232,.18);
        border-top-color: #1E5FD6;
        animation: pl-rot .9s linear infinite;
      }
      .dark .pl-spin { border-color: rgba(126,179,248,.22); border-top-color: #7EB3F8; }
      .pl-wordmark {
        background: linear-gradient(100deg, #1E5FD6 18%, #3B79E8 38%, #CFE3FC 50%, #3B79E8 62%, #1E5FD6 82%);
        background-size: 220% 100%;
        -webkit-background-clip: text; background-clip: text; color: transparent;
        animation: pl-shine 2.8s linear infinite;
      }
      @keyframes pl-rot { to { transform: rotate(360deg); } }
      @keyframes pl-shine { from { background-position: 130% 0; } to { background-position: -130% 0; } }
      @media (prefers-reduced-motion: reduce) {
        .pl-spin, .pl-wordmark { animation: none !important; }
      }
    `}</style>
  )
}
