'use client'

import { useAppStore } from '@/stores/app-store'
import { Card, CardContent } from '@/components/ui/card'
/* (و71) ترجمة حسب لغة الزائر — النصوص من الأدمن عربي/إنجليزي */
import { useLangStore, pickConfig } from '@/lib/i18n'
import { BookOpen, Brain, Puzzle, ClipboardCheck, Star, Target, Zap, Award, Sparkles, TrendingUp } from 'lucide-react'

/* (و78) أيقونات وألوان إضافية للنصائح/المميزات اللي المستر بيضيفها من الأدمن — بتلف بالتدوير */
var EXTRA_FEATURE_ICONS = [Star, Target, Zap, Award, Sparkles, TrendingUp]
var ALL_FEATURE_ICONS = [BookOpen, Brain, Puzzle, ClipboardCheck].concat(EXTRA_FEATURE_ICONS)
var ALL_FEATURE_COLORS = [
  'bg-[#C49A38]/10 text-[#C49A38] dark:bg-[#C49A38]/15 dark:text-[#E5BE5A]',
  'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  'bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  'bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
  'bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
]

export function FeaturesSection() {
  const { siteConfig } = useAppStore()
  const cfg = siteConfig
  var lang = useLangStore(function (s) { return s.lang })

  /* (و78) المميزات الإضافية من لوحة الأدمن — مفتاح custom_features (JSON مصفوفة:
     titleAr/titleEn/descAr/descEn) — بتظهر بعد المميزات الأصلية بنفس الكارت،
     وأيقونة/لون بالتدوير. أي JSON بايظ = نتجاهله بأمان. */
  var customFeatures: any[] = []
  try {
    var parsedCustomFeatures = typeof cfg.custom_features === 'string' ? JSON.parse(cfg.custom_features) : cfg.custom_features
    if (Array.isArray(parsedCustomFeatures)) {
      for (var cf = 0; cf < parsedCustomFeatures.length; cf++) {
        var cc = parsedCustomFeatures[cf]
        if (!cc || typeof cc !== 'object' || (!cc.titleAr && !cc.titleEn)) continue
        customFeatures.push({
          uid: 'custom-feature-' + cf,
          icon: ALL_FEATURE_ICONS[(4 + cf) % ALL_FEATURE_ICONS.length],
          title: lang === 'en' ? (String(cc.titleEn || '') || String(cc.titleAr || '')) : (String(cc.titleAr || '') || String(cc.titleEn || '')),
          description: lang === 'en' ? (String(cc.descEn || '') || String(cc.descAr || '')) : (String(cc.descAr || '') || String(cc.descEn || '')),
          color: ALL_FEATURE_COLORS[(4 + cf) % ALL_FEATURE_COLORS.length],
        })
      }
    }
  } catch (e) {}

  const features = [
    {
      icon: BookOpen,
      title: pickConfig(cfg, 'feature1_title', lang, 'شرح مبسط', 'Simplified Explanations'),
      description: pickConfig(cfg, 'feature1_desc', lang, 'شرح واضح ومبسط لكل درس رياضيات بطريقة تساعد الطالب على الفهم السريع والاستيعاب العميق لمفاهيم Algebra و Geometry الأساسية.', 'Clear, simplified explanation for every math lesson that helps students understand quickly and master the core Algebra and Geometry concepts.'),
      color: 'bg-[#C49A38]/10 text-[#C49A38] dark:bg-[#C49A38]/15 dark:text-[#E5BE5A]',
    },
    {
      icon: Brain,
      title: pickConfig(cfg, 'feature2_title', lang, 'فهم العمليات', 'Deep Understanding'),
      description: pickConfig(cfg, 'feature2_desc', lang, 'نركّز على فهم العمليات الرياضية من الجذور وليس الحفظ فقط، مما يبني قدرة حقيقية على حل أي مسألة في Formulas و Problem Solving.', 'We focus on understanding math from the roots, not memorization — building real problem-solving power.'),
      color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    {
      icon: Puzzle,
      title: pickConfig(cfg, 'feature3_title', lang, 'حل المسائل', 'Step-by-Step Solutions'),
      description: pickConfig(cfg, 'feature3_desc', lang, 'حل خطوة بخطوة للمسائل المعقدة مع Cheat Sheets وملخصات بصرية تسهّل الفهم والتذكّر.', 'Step-by-step solutions for complex problems, with Cheat Sheets and visual summaries that make understanding and recall easier.'),
      color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    },
    {
      icon: ClipboardCheck,
      title: pickConfig(cfg, 'feature4_title', lang, 'تحضير وامتحانات', 'Reviews & Exams'),
      description: pickConfig(cfg, 'feature4_desc', lang, 'تحضير شامل ومراجعات دورية واختبارات أسبوعية لضمان التفوّق والاستعداد الكامل للامتحانات النهائية في جميع فروع الرياضيات.', 'Comprehensive preparation, regular reviews, and weekly exams to guarantee excellence and full readiness for final exams.'),
      color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
    },
  ].concat(customFeatures)

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold sm:text-3xl">{pickConfig(cfg, 'features_title', lang, 'لماذا تختارنا؟', 'Why Choose Us?')}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            {pickConfig(cfg, 'features_subtitle', lang, 'نقدّم لك تجربة تعليمية فريدة تجمع بين الشرح المبسط والتطبيق العملي في Algebra, Geometry, and More', 'A unique learning experience combining simple explanations and hands-on practice across Algebra, Geometry, and More')}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature: any) => (
            <Card
              key={feature.uid || feature.title}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
            >
              <CardContent className="p-6 space-y-4">
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base leading-snug">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
