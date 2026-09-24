'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/stores/app-store'
import { useEffect, useState } from 'react'
import { CalendarClock, Clock, GraduationCap, ArrowRight, BookOpen } from 'lucide-react'
import { PlatformLoader } from '@/components/PlatformLoader'
/* (و64) زراير الثيم + اللغة الموحدة في كل المنصة */
import { PlatformToggles } from '@/components/platform-toggles'
/* (و71) ترجمة حسب لغة الزائر */
import { useLangStore, pickConfig, useT } from '@/lib/i18n'
import Link from 'next/link'

interface ScheduleSlot {
  time: string
  grade: string
}

interface DaySchedule {
  day: string
  slots: ScheduleSlot[]
}

// Default schedule - editable from admin via siteConfig.schedule_data (JSON)
const DEFAULT_SCHEDULE: DaySchedule[] = [
  {
    day: 'السبت',
    slots: [
      { time: '10:00 صباحًا', grade: 'الصف السادس الابتدائي' },
      { time: '12:00 ظهرًا', grade: 'تالتة إعدادي' },
    ],
  },
  {
    day: 'الأحد',
    slots: [
      { time: '2:00 ظهرًا', grade: 'الصف السادس الابتدائي' },
    ],
  },
  {
    day: 'الإثنين',
    slots: [
      { time: '2:00 ظهرًا', grade: 'تالتة إعدادي' },
    ],
  },
  {
    day: 'الثلاثاء',
    slots: [
      { time: '2:00 ظهرًا', grade: 'الصف السادس الابتدائي' },
      { time: '3:30 عصرًا', grade: 'تالتة إعدادي' },
    ],
  },
  {
    day: 'الأربعاء',
    slots: [
      { time: '2:00 ظهرًا', grade: 'أولى إعدادي' },
      { time: '4:00 عصرًا', grade: 'تانية إعدادي' },
    ],
  },
  {
    day: 'الخميس',
    slots: [
      { time: '2:00 ظهرًا', grade: 'تانية إعدادي' },
      { time: '4:00 عصرًا', grade: 'أولى إعدادي' },
      { time: '5:30 مساءً', grade: 'أولى بكالوريا' },
    ],
  },
]

// Arabic pluralization for "حصة" — (10-b) بالإنجليزي sessions
function slotCountLabel(count: number, lang: string): string {
  if (lang === 'en') return count === 1 ? '1 session' : count + ' sessions'
  if (count === 1) return 'حصة واحدة'
  if (count === 2) return 'حصتين'
  if (count >= 3 && count <= 10) return count + ' حصص'
  return count + ' حصة'
}

export default function SchedulePage() {
  const { siteConfig, setSiteConfig, configLoaded } = useAppStore()
  const [loading, setLoading] = useState(true)
  /* (10-b) الاتجاه بيتبع اللغة — الإنجليزي افتراضي LTR والعربي RTL */
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

  // Parse schedule from siteConfig.schedule_data (JSON string) or use default
  // (و71) العناوين حسب لغة الزائر — الأدمن يكتب عربي/إنجليزي
  let schedule: DaySchedule[] = DEFAULT_SCHEDULE
  let scheduleTitle = pickConfig(siteConfig, 'schedule_title', lang, 'مواعيد السنتر', 'Center Schedule')
  let scheduleSubtitle = pickConfig(siteConfig, 'schedule_subtitle', lang, 'جدول مواعيد الحصص الأسبوعية لكل الصفوف الدراسية — اختر اليوم المناسب لك وتابع موعد حصتك', 'Weekly class schedule for all grades — pick the day that suits you and catch your class on time')
  let scheduleBadge = pickConfig(siteConfig, 'schedule_badge', lang, 'جدول الحصص الأسبوعي', 'Weekly Class Schedule')
  let scheduleFooterNote = 'جميع المواعيد بتوقيت القاهرة. لو عندك أي استفسار عن موعد حصتك تواصل معنا عبر واتساب.'
  let brandName = 'Zicola In Math'

  try {
    if (siteConfig.schedule_data) {
      const parsed = JSON.parse(siteConfig.schedule_data)
      if (Array.isArray(parsed) && parsed.length > 0) {
        schedule = parsed
      }
    }
    if (siteConfig.schedule_title) scheduleTitle = siteConfig.schedule_title
    if (siteConfig.schedule_subtitle) scheduleSubtitle = siteConfig.schedule_subtitle
    if (siteConfig.schedule_badge) scheduleBadge = siteConfig.schedule_badge
    /* (و71) الإنجليزي: لو الأدمن كاتب النسخ الإنجليزية نستخدمها */
    if (lang === 'en') {
      if (siteConfig.schedule_title_en) scheduleTitle = siteConfig.schedule_title_en
      if (siteConfig.schedule_subtitle_en) scheduleSubtitle = siteConfig.schedule_subtitle_en
      if (siteConfig.schedule_badge_en) scheduleBadge = siteConfig.schedule_badge_en
    }
    if (siteConfig.schedule_footer_note) scheduleFooterNote = siteConfig.schedule_footer_note
    if (siteConfig.schedule_brand) brandName = siteConfig.schedule_brand
  } catch (e) {
    // keep defaults
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={pageDir}>
        {/* (2026-و95) لودر رموز الرياضيات الموحد */}
        <PlatformLoader variant="inline" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir={pageDir}>
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                {scheduleTitle}
              </h1>
              <p className="text-[11px] text-muted-foreground">{brandName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* (و64) الإضاءة الليلية/النهارية + تبديل اللغة — في كل المنصة */}
            <PlatformToggles />
            <Link href="/">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <ArrowRight className="h-4 w-4 ml-1" />
                {T('العودة للرئيسية', 'Back to Home')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-4">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>{scheduleBadge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {scheduleTitle}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {scheduleSubtitle}
          </p>
        </div>

        {/* Schedule Grid — (10-b) كروت خفيفة بحواف ناعمة بطلب صاحب المنصة:
            rounded-xl + حد رفيع border-border + خلفية هادية (bg-card + هيدر
            bg-muted/30) + padding مريح — من غير جريدينت ولا ظلال تقيلة */}
        <div className="grid gap-5 md:grid-cols-2">
          {schedule.map((daySchedule, dayIdx) => {
            const count = daySchedule.slots.length
            return (
              <Card
                key={dayIdx}
                className="overflow-hidden rounded-xl border border-border bg-card py-0 gap-0 shadow-none hover:bg-muted/10 transition-colors"
              >
                {/* Day header — خفيف: خلفية هادية وحد سفلي رفيع (بدون جريدينت) */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
                  <h3 className="text-base font-bold text-foreground">
                    {daySchedule.day}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground border border-border/50 bg-background px-2.5 py-0.5 rounded-full">
                    {slotCountLabel(count, lang)}
                  </span>
                </div>

                {/* Slots */}
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {daySchedule.slots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        {/* Time */}
                        <div className="flex items-center gap-2 shrink-0 min-w-[110px]">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-bold text-foreground" dir="ltr">
                            {slot.time}
                          </span>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-border/50" />

                        {/* Grade */}
                        <div className="flex items-center gap-2 flex-1">
                          <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground">
                            {slot.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-muted/50 border border-border/40 px-5 py-3 max-w-2xl">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {scheduleFooterNote}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
