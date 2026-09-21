'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/stores/app-store'
/* (و71) ترجمة حسب لغة الزائر — النصوص من الأدمن عربي/إنجليزي */
import { useLangStore, pickConfig } from '@/lib/i18n'
import { Lightbulb, Clock, Brain, Pencil, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

var TIP_ICONS = [Clock, Brain, Pencil, MessageCircle]
var TIP_COLORS = [
  'bg-[#C49A38]/10 text-[#C49A38] dark:bg-[#C49A38]/15 dark:text-[#E5BE5A]',
  'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
]

export default function TipsSection() {
  var { siteConfig, setSiteConfig, configLoaded } = useAppStore()
  /* (و71) لغة الزائر */
  var lang = useLangStore(function (s) { return s.lang })

  var initialCfg = (typeof window !== 'undefined' && (window as any).__INITIAL_CONFIG__) || {}
  var cfg = configLoaded ? siteConfig : (Object.keys(siteConfig).length > 0 ? siteConfig : initialCfg)

  useEffect(function() {
    if (!configLoaded && Object.keys(siteConfig).length === 0) {
      fetch('/api/config')
        .then(function(r) { return r.json() })
        .then(function(data) {
          setSiteConfig(data)
          useAppStore.getState().setConfigLoaded(true)
        })
        .catch(function() {})
    }
  }, [configLoaded, siteConfig, setSiteConfig])

  var tipsBgImage = cfg.tips_bg_image || ''
  var tipsSectionImage = cfg.tips_section_image || ''
  var tipImages = [
    cfg.tip1_image || '',
    cfg.tip2_image || '',
    cfg.tip3_image || '',
  ]
  var [tipLoaded, setTipLoaded] = useState([false, false, false, false])
  var [bgLoaded, setBgLoaded] = useState(false)
  var [sectionImgLoaded, setSectionImgLoaded] = useState(false)

  /* (و78) النصائح الإضافية اللي المستر بيضيفها من لوحة الأدمن — مفتاح
     custom_tips في الإعدادات (JSON مصفوفة عناصر: titleAr/titleEn/descAr/descEn).
     بتظهر بعد النصائح الأصلية بنفس شكل الكارت بالظبط، والأيقونة واللون
     بيلفوا على المجموعات الموجودة. أي JSON بايظ = نتجاهله بأمان. */
  var customTips: any[] = []
  try {
    var parsedCustomTips = typeof cfg.custom_tips === 'string' ? JSON.parse(cfg.custom_tips) : cfg.custom_tips
    if (Array.isArray(parsedCustomTips)) {
      for (var ci = 0; ci < parsedCustomTips.length; ci++) {
        var ct = parsedCustomTips[ci]
        if (!ct || typeof ct !== 'object' || (!ct.titleAr && !ct.titleEn)) continue
        customTips.push({
          uid: 'custom-tip-' + ci,
          icon: TIP_ICONS[(4 + ci) % TIP_ICONS.length],
          titleAr: String(ct.titleAr || ''),
          titleEn: String(ct.titleEn || ''),
          description: String(ct.descAr || ''),
          descriptionEn: String(ct.descEn || ''),
          color: TIP_COLORS[(4 + ci) % TIP_COLORS.length],
        })
      }
    }
  } catch (e) {}

  var tips = [
    {
      icon: TIP_ICONS[0],
      titleAr: cfg.tips_card1_title || 'حدد وقت يومي للمراجعة',
      titleEn: cfg.tips_card1_title_en || 'Set Daily Review Time',
      description: cfg.tips_card1_desc || 'خصص 20-30 دقيقة كل يوم لمراجعة ما تعلمته. الاستمرارية هي مفتاح التفوّق في الرياضيات.',
      descriptionEn: cfg.tips_card1_desc_en || 'Dedicate 20-30 minutes every day to review what you learned. Consistency is the key to excellence in mathematics.',
      color: TIP_COLORS[0],
    },
    {
      icon: TIP_ICONS[1],
      titleAr: cfg.tips_card2_title || 'ركز على الفهم وليس الحفظ',
      titleEn: cfg.tips_card2_title_en || 'Focus on Understanding, Not Memorization',
      description: cfg.tips_card2_desc || 'حاول فهم لماذا وليس كيف فقط. الفهم العميق يبقي المعلومة لفترة أطول ويساعدك في حل مسائل جديدة.',
      descriptionEn: cfg.tips_card2_desc_en || 'Try to understand why, not just how. Deep understanding keeps knowledge longer and helps you solve new problems.',
      color: TIP_COLORS[1],
    },
    {
      icon: TIP_ICONS[2],
      titleAr: cfg.tips_card3_title || 'حل مسائل إضافية كل يوم',
      titleEn: cfg.tips_card3_title_en || 'Solve Extra Problems Daily',
      description: cfg.tips_card3_desc || 'لا تكتفي بالواجبات فقط. حل مسائل إضافية من الكتاب المدرسي لتعزيز مهاراتك.',
      descriptionEn: cfg.tips_card3_desc_en || 'Do not stop at homework. Solve extra problems from the textbook to strengthen your skills.',
      color: TIP_COLORS[2],
    },
    {
      icon: TIP_ICONS[3],
      titleAr: cfg.tips_card4_title || 'لا تتردد في السؤال',
      titleEn: cfg.tips_card4_title_en || 'Never Hesitate to Ask',
      description: cfg.tips_card4_desc || 'إذا لم تفهم شيئاً اسأل فوراً. السؤال الجيد هو بداية الفهم العميق.',
      descriptionEn: cfg.tips_card4_desc_en || 'If you do not understand something, ask immediately. A good question is the start of deep understanding.',
      color: TIP_COLORS[3],
    },
  ].concat(customTips)

  function renderTipCard(tip, idx) {
    return (
      <Card
        key={tip.uid || tip.titleEn}
        className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border/50 bg-card"
      >
        <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
          {tipImages[idx] ? (
            <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-border/50 relative">
              {!tipLoaded[idx] && <div className="h-full w-full animate-pulse bg-muted" />}
              <img
                src={tipImages[idx]}
                alt={tip.titleAr}
                className={"h-full w-full object-cover transition-opacity duration-300 " + (tipLoaded[idx] ? 'opacity-100' : 'opacity-0 absolute')}
                loading="eager"
                onLoad={function() { setTipLoaded(function(prev) { var n = [...prev]; n[idx] = true; return n }) }}
              />
            </div>
          ) : (
            <div
              className={"inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 " + tip.color}
            >
              <tip.icon className="h-5 w-5" />
            </div>
          )}
          <div className="space-y-1.5 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug">
              {/* (و71) حسب اللغة: إنجليزي = العنوان الإنجليزي رئيسي والعربي تحته، والعكس */}
              {lang === 'en' ? (
                <>
                  <span className="block">{tip.titleEn}</span>
                  <span className="block text-xs sm:text-sm text-muted-foreground font-normal mt-0.5" dir="rtl">{tip.titleAr}</span>
                </>
              ) : (
                <>
                  <span className="block">{tip.titleAr}</span>
                  <span className="block text-xs sm:text-sm text-muted-foreground font-normal mt-0.5" dir="ltr">{tip.titleEn}</span>
                </>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {lang === 'en' ? tip.descriptionEn : tip.description}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="py-16 sm:py-20 relative" dir="rtl">
      {/* Background image */}
      {tipsBgImage && (
        <>
          {!bgLoaded && (
            <div className="absolute inset-0 animate-pulse bg-muted/50" />
          )}
          <img
            src={tipsBgImage}
            alt=""
            className={"absolute inset-0 w-full h-full object-cover -z-10 transition-opacity duration-500 " + (bgLoaded ? 'opacity-100' : 'opacity-0')}
            loading="eager"
            fetchPriority="high"
            onLoad={function() { setBgLoaded(true) }}
          />
          <div className="absolute inset-0 -z-10 bg-muted/80" />
        </>
      )}
      {!tipsBgImage && <div className="absolute inset-0 -z-10 bg-muted/30" />}

      <div className="mx-auto max-w-5xl px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Lightbulb className="h-4 w-4" />
            <span>{pickConfig(cfg, 'tips_badge', lang, 'نصائح للتفوّق', 'Tips for Excellence')}</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl text-foreground">
            {pickConfig(cfg, 'tips_title', lang, 'نصائح للمستر', "Teacher's Tips")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            {pickConfig(cfg, 'tips_subtitle', lang, 'نصائح ذهبية من مستر أحمد شعبان للتفوّق في الرياضيات', 'Golden advice from Mr. Ahmed Shaban to excel in mathematics')}
          </p>
        </div>

        {/* Two-column layout: Tips (left) + Image (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 lg:gap-8 items-start">
          {/* Tips column - on mobile: order 2 (below), on desktop: LEFT (order 2 in RTL) */}
          <div className="order-2 lg:order-2 space-y-4">
            {tips.map(function(tip, idx) {
              return renderTipCard(tip, idx)
            })}
          </div>

          {/* Image column - on mobile: order 1 (on top), on desktop: RIGHT (order 1 in RTL) */}
          {tipsSectionImage && (
            <div className="order-1 lg:order-1">
              <div className="lg:sticky lg:top-24 relative rounded-2xl overflow-hidden shadow-xl border border-border/20">
                {!sectionImgLoaded && (
                  <div className="w-full aspect-[3/4] animate-pulse bg-muted" />
                )}
                <img
                  src={tipsSectionImage}
                  alt="نصائح مستر أحمد شعبان"
                  className={"w-full aspect-[3/4] object-cover transition-opacity duration-500 " + (sectionImgLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0')}
                  loading="eager"
                  onLoad={function() { setSectionImgLoaded(true) }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
