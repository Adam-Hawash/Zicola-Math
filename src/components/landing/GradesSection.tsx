'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useAppStore, gradesFromConfig } from '@/stores/app-store'
import { toast } from 'sonner'
/* (و71) ترجمة عناوين القسم حسب لغة الزائر */
import { useT, useLangStore } from '@/lib/i18n'

export function GradesSection() {
  var T = useT()
  /* (و98) لغة الزائر — الإنجليزي الأول في الوضع الإنجليزي والعربي الأول في العربي
     (طلب المستر: «في الحالتين كنت بتخلي العربي ظاهر الأول في الصفوف الدراسية») */
  var lang = useLangStore(function (s) { return s.lang })
  var siteConfig = useAppStore(function (s) { return s.siteConfig })
  var cfg = siteConfig
  // (24-b) القايمة بقت ديناميكية من لوحة الأدمن — والإيموجي هو اللي
  // بيظهر جنب اسم الصف (طلب المستر: «الإيموجي بتاعه اللي يظهر فوق الصورة»)
  var grades = gradesFromConfig(siteConfig)

  var handleGradeClick = function(gradeName: string) {
    toast.info(T('سجّل أولاً ثم ادخل حسابك للوصول إلى مواد ', 'Register first, then log in to access ') + gradeName)
    useAppStore.getState().setShowStudentRegister(true)
  }

  return (
    <section className="py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {T(cfg.grades_title || 'السنوات الدراسية', cfg.grades_title_en || 'Academic Years')}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            {T(cfg.grades_subtitle || 'اختر صفك الدراسي للوصول إلى المحتوى التعليمي المخصص لك', cfg.grades_subtitle_en || 'Choose your grade to access the learning content made for you')}
          </p>
        </div>
        {/* (و71) سبعة صفوف بعد إضافة رابعة وخمسة ابتدائي */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {grades.map(function(grade) {
            return (
              <Card
                key={grade.ar}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 border-border/50"
                onClick={function() { handleGradeClick(grade.ar) }}
              >
                <CardContent className="p-4 sm:p-6 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <span className="text-2xl leading-none" role="img" aria-label={grade.ar}>
                      {grade.emoji || grade.short || grade.ar[0]}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {/* (و98) الاسم الرئيسي بلغة الزائر والتاني تحته */}
                    <h3 className="font-semibold text-sm leading-tight">
                      {lang === 'en' ? grade.en : grade.ar}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium tracking-wide" dir={lang === 'en' ? 'rtl' : 'ltr'}>
                      {lang === 'en' ? grade.ar : grade.en}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
