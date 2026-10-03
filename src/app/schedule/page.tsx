'use client'

import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { useEffect, useState } from 'react'
import { CalendarClock, ArrowRight, BookOpen } from 'lucide-react'
import { PlatformLoader } from '@/components/PlatformLoader'
/* (و64) زراير الثيم + اللغة الموحدة في كل المنصة */
import { PlatformToggles } from '@/components/platform-toggles'
/* (و71) ترجمة حسب لغة الزائر */
import { useLangStore, pickConfig, useT } from '@/lib/i18n'
import Link from 'next/link'
/* (ص8) رندر كروت الأيام المشترك */
import { ScheduleDayGrid, type DaySchedule } from '@/components/ScheduleDayGrid'

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
      { time: '5:30 مساءً', grade: 'أولى ثانوي' },
    ],
  },
]

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
        <ScheduleDayGrid days={schedule} lang={lang} />

        {/* Footer note */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-muted/50 border border-border/40 px-5 py-3 max-w-2xl">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {scheduleFooterNote}
            </p>
          </div>
        </div>

        {/* ===== (ص8) زرار «Private Classes» — طلب المستر الحرفي:
            «برايفت كلاسز كلمه كده تبقى تحت على الشمال اللي يدوس عليها
            تدخله على البرايفت... زي كلمه ادم حواش دي كلمه اللي يدوس
            عليها تبقى تعتبر زي لينك» — كلمة لينك بسيطة تحت على الشمال
            (زي توقيع المطور في الفوتر بالظبط) بتفتح صفحة حصص البرايفت ===== */}
        <div className="mt-12 flex items-center justify-start" dir="ltr">
          <Link
            href="/schedule/private"
            className="text-sm font-semibold text-muted-foreground hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            Private Classes
          </Link>
        </div>
      </main>
    </div>
  )
}
