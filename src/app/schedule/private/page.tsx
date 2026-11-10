'use client'

/* ============================================================
   (ص8) صفحة حصص البرايفت — طلب المستر الحرفي:
   «برايفت كلاسز كلمه كده تبقى تحت على الشمال اللي يدوس عليها
   تدخله على البرايفت» — نفس شكل الحصص العادية بالظبط بس برايفت
   (البيانات من private_schedule_data — بتتضاف من لوحة الأدمن)
   ============================================================ */
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { useEffect, useState } from 'react'
import { CalendarClock, ArrowRight, Lock } from 'lucide-react'
import { PlatformLoader } from '@/components/PlatformLoader'
import { PlatformToggles } from '@/components/platform-toggles'
import { useLangStore, useT } from '@/lib/i18n'
import Link from 'next/link'
import { ScheduleDayGrid, type DaySchedule } from '@/components/ScheduleDayGrid'

export default function PrivateClassesPage() {
  const { siteConfig, setSiteConfig, configLoaded } = useAppStore()
  const [loading, setLoading] = useState(true)
  var lang = useLangStore(function (s) { return s.lang })
  var T = useT()
  var pageDir = lang === 'en' ? 'ltr' : 'rtl'

  useEffect(() => {
    if (!configLoaded) {
      fetch('/api/config')
        .then((r) => r.json())
        .then((data) => {
          setSiteConfig(data)
          useAppStore.getState().setConfigLoaded(true)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [configLoaded, setSiteConfig])

  /* قراءة حصص البرايفت — نفس الشكل، والفشل = فاضي بأمان */
  let privateSchedule: DaySchedule[] = []
  let brandName = 'Zicola In Math'
  try {
    if (siteConfig.private_schedule_data) {
      const parsedPriv = JSON.parse(siteConfig.private_schedule_data)
      if (Array.isArray(parsedPriv) && parsedPriv.length > 0) {
        privateSchedule = parsedPriv
          .map(function (d: any) {
            return {
              day: String((d && d.day) || ''),
              slots: (Array.isArray(d && d.slots) ? d.slots : [])
                .map(function (s: any) {
                  return { time: String((s && s.time) || ''), grade: String((s && s.grade) || '') }
                })
                .filter(function (s: { time: string; grade: string }) { return s.time || s.grade }),
            }
          })
          .filter(function (d: DaySchedule) { return d.day && d.slots.length > 0 })
      }
    }
    if (siteConfig.schedule_brand) brandName = siteConfig.schedule_brand
  } catch (e) {
    // keep empty — safe
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={pageDir}>
        <PlatformLoader variant="inline" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir={pageDir}>
      {/* Header — نفس هيدر مواعيد السنتر بالظبط */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                {T('حصص البرايفت', 'Private Classes')}
              </h1>
              <p className="text-[11px] text-muted-foreground">{brandName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PlatformToggles />
            <Link href="/schedule">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <ArrowRight className="h-4 w-4 ml-1" />
                {T('مواعيد السنتر', 'Center Schedule')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-4">
            <Lock className="h-3.5 w-3.5" />
            <span>{T('حصص خاصة', 'Private Sessions')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {T('حصص البرايفت', 'Private Classes')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {T('جدول مواعيد الحصص الخاصة — نفس مواعيد السنتر بس برايفت', 'Private sessions schedule — same as the center schedule but private')}
          </p>
        </div>

        {/* الجريد — نفس شكل الحصص العادية بالظبط */}
        {privateSchedule.length > 0 ? (
          <ScheduleDayGrid days={privateSchedule} lang={lang} />
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-12 text-center">
            <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-bold text-foreground mb-2">
              {T('لسه مفيش حصص برايفت مضافة', 'No private classes added yet')}
            </p>
            <p className="text-xs text-muted-foreground">
              {T('تابعنا — الحصص الخاصة هتظهر هنا أول ما تتحدد', 'Stay tuned — private sessions will appear here once scheduled')}
            </p>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-muted/50 border border-border/40 px-5 py-3 max-w-2xl">
            <CalendarClock className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {T('جميع المواعيد بتوقيت القاهرة. لو عندك أي استفسار عن موعد حصتك تواصل معنا عبر واتساب.', 'All times are Cairo time. For any question about your session, reach us on WhatsApp.')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
