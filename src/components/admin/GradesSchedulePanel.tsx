'use client'

// ============================================================
// (24-b) لوحة الصفوف الدراسية + مواعيد السنتر — طلب المستر:
// «عايز أقدر أتحكم في الصفوف الدراسية، أقدر أضيف صف، أمسح صف،
// أخلي الاسم بالعربي وبالإنجليزي والإيموجي بتاعه اللي يظهر
// فوق الصورة» + «أقدر أغير في مواعيد السنتر وأحذف يوم أو أزود
// يوم وهكذا»
//
// الحفظ بيتم في SiteConfig بمفتاحين:
//   grades_data    = JSON للصفوف [{ ar, en, emoji, short }]
//   schedule_data  = JSON للمواعيد [{ day, slots: [{ time, grade }] }]
// ولو اسم صف اتغير بالعربي، بنبّه /api/grades/apply-rename بعد
// الحفظ عشان الاسم الجديد ينتشر على كل الطلاب والفيديوهات
// والواجبات والامتحانات.
//
// (ص7) حصص البرايفت — طلب المستر حرفيًا: «حصص البرايفت تبقى في
// مواعيد السنتر، في الآخر حاجة اسمها حصص البرايفت اللي يدوس
// عليها تظهر حصص البرايفت كلها زي الحصص العادية بس برايفت،
// وأنا أقدر أضيفها من صفحة الأدمن برضه» → قسم تالت هنا بيحفظ في
// SiteConfig بمفتاح private_schedule_data (نفس شكل schedule_data)
// وبيظهر في آخر صفحة /schedule جوه قسم قابل للفتح.
// ============================================================

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CalendarClock, CalendarPlus, Clock, GraduationCap, Loader2, Lock, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { gradesFromConfig, useAppStore, type GradeItem } from '@/stores/app-store'

// ===== مواعيد السنتر — نفس شكل src/app/schedule/page.tsx =====
interface ScheduleSlot {
  time: string
  grade: string
}

interface DaySchedule {
  day: string
  slots: ScheduleSlot[]
}

// نفس الـ DEFAULT_SCHEDULE بتاع صفحة /schedule (بنسخه هنا عشان
// لوحة الأدمن تبدأ بنفس الجدول لو مفيش بيانات محفوظة)
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

// مهم نحافظ على الأسماء القياسية للأيام — صفحة /schedule بتلوّن
// الكارت بناءً على اسم اليوم بالظبط (DAY_COLORS)
const ARABIC_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

// بتفك JSON من siteConfig.schedule_data ولو فاشل/فاضي بترجّع نسخة من الافتراضي
function parseSchedule(siteConfig: { [key: string]: string } | null | undefined): DaySchedule[] {
  try {
    var raw = siteConfig ? siteConfig.schedule_data : null
    if (typeof raw === 'string' && raw.trim() !== '') {
      var parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        var out: DaySchedule[] = []
        for (var i = 0; i < parsed.length; i++) {
          var d: any = parsed[i] || {}
          var slots: ScheduleSlot[] = []
          if (Array.isArray(d.slots)) {
            for (var s = 0; s < d.slots.length; s++) {
              var sl: any = d.slots[s] || {}
              slots.push({ time: String(sl.time || ''), grade: String(sl.grade || '') })
            }
          }
          out.push({ day: String(d.day || ''), slots: slots })
        }
        return out
      }
    }
  } catch (e) { /* فولباك تحت */ }
  // نسخة عميقة بسيطة من الافتراضي عشان ما نعدّلش على الثابت
  return DEFAULT_SCHEDULE.map(function (d) {
    return { day: d.day, slots: d.slots.map(function (s) { return { time: s.time, grade: s.grade } }) }
  })
}

/* (ص7) قارئ حصص البرايفت — نفس الشكل من غير افتراضي (فاضي = مفيش برايفت) */
function parsePrivateSchedule(siteConfig: { [key: string]: string } | null | undefined): DaySchedule[] {
  try {
    var raw = siteConfig ? (siteConfig as any).private_schedule_data : null
    if (typeof raw === 'string' && raw.trim() !== '') {
      var parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        var out: DaySchedule[] = []
        for (var i = 0; i < parsed.length; i++) {
          var d: any = parsed[i] || {}
          var slots: ScheduleSlot[] = []
          if (Array.isArray(d.slots)) {
            for (var s = 0; s < d.slots.length; s++) {
              var sl: any = d.slots[s] || {}
              slots.push({ time: String(sl.time || ''), grade: String(sl.grade || '') })
            }
          }
          out.push({ day: String(d.day || ''), slots: slots })
        }
        return out
      }
    }
  } catch (e) { /* فولباك: فاضي */ }
  return []
}

// بنقارن الأسماء العربية القديمة بالجديدة: أي صف اتغير اسمه العربي
// (وإحنا عارفين إنه نفس الصف بنفس الكود القصير أو الاسم الإنجليزي
// أو نفس مكانه) بنرجّع { from, to } لنشرها على كل البيانات
function detectRenames(originals: GradeItem[], current: GradeItem[]): Array<{ from: string; to: string }> {
  var renames: Array<{ from: string; to: string }> = []
  for (var i = 0; i < current.length; i++) {
    var nu = current[i]
    var newAr = (nu.ar || '').trim()
    if (!newAr) continue
    var oldMatch: GradeItem | null = null
    for (var j = 0; j < originals.length; j++) {
      var ol = originals[j]
      var sameShort = nu.short.trim() !== '' && ol.short === nu.short.trim()
      var sameEn = nu.en.trim() !== '' && ol.en === nu.en.trim()
      if (sameShort || sameEn) { oldMatch = ol; break }
    }
    if (!oldMatch && i < originals.length) oldMatch = originals[i]
    var oldAr = oldMatch ? (oldMatch.ar || '').trim() : ''
    if (oldAr && oldAr !== newAr) {
      var dup = false
      for (var k = 0; k < renames.length; k++) {
        if (renames[k].from === oldAr && renames[k].to === newAr) { dup = true; break }
      }
      if (!dup) renames.push({ from: oldAr, to: newAr })
    }
  }
  return renames
}

/* ============================================================
   (ص7) محرر الأيام المشترك — نفس واجهة مواعيد السنتر بالظبط
   بيتستخدم للجدول العادي وجدول البرايفت (نفس الشكل زي ما طلب)
   ============================================================ */
function DayEditorList(props: {
  days: DaySchedule[]
  gradeOptions: GradeItem[]
  onUpdateDay: (idx: number, day: string) => void
  onRemoveDay: (idx: number) => void
  onAddDay: () => void
  onUpdateSlot: (dayIdx: number, slotIdx: number, patch: Partial<ScheduleSlot>) => void
  onAddSlot: (dayIdx: number) => void
  onRemoveSlot: (dayIdx: number, slotIdx: number) => void
  addDayLabel: string
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {props.days.map(function (day, dayIdx) {
          // لو اليوم مش من الأيام القياسية نضمّعه في القايمة عشان يظهر
          var dayOptions = ARABIC_DAYS.indexOf(day.day) !== -1 ? ARABIC_DAYS : [day.day].concat(ARABIC_DAYS)
          return (
            <div key={dayIdx} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
              {/* اسم اليوم + حذف اليوم */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <select
                  value={day.day}
                  onChange={function (e) { props.onUpdateDay(dayIdx, e.target.value) }}
                  className="h-10 min-h-[38px] flex-1 rounded-md border border-input bg-transparent px-3 text-sm font-bold cursor-pointer"
                >
                  {dayOptions.map(function (d) {
                    return <option key={d} value={d}>{d || '— اختار اليوم —'}</option>
                  })}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  onClick={function () { props.onRemoveDay(dayIdx) }}
                  title="حذف اليوم كله"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* حصص اليوم */}
              <div className="space-y-2">
                {day.slots.map(function (slot, slotIdx) {
                  return (
                    <div
                      key={slotIdx}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-card p-2"
                    >
                      <Input
                        value={slot.time}
                        onChange={function (e) { props.onUpdateSlot(dayIdx, slotIdx, { time: e.target.value }) }}
                        placeholder="10:00 صباحًا"
                        className="flex-1 min-w-[125px] min-h-[38px] h-9"
                      />
                      <select
                        value={slot.grade}
                        onChange={function (e) { props.onUpdateSlot(dayIdx, slotIdx, { grade: e.target.value }) }}
                        className="h-9 min-h-[38px] flex-1 min-w-[135px] rounded-md border border-input bg-transparent px-2 text-sm cursor-pointer"
                      >
                        <option value="">اختر الصف</option>
                        {props.gradeOptions.map(function (g) {
                          return <option key={g.ar} value={g.ar}>{(g.emoji ? g.emoji + ' ' : '') + g.ar}</option>
                        })}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                        onClick={function () { props.onRemoveSlot(dayIdx, slotIdx) }}
                        title="حذف الحصة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
                {day.slots.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-1">مفيش حصص في اليوم ده</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[36px] w-full border-dashed"
                  onClick={function () { props.onAddSlot(dayIdx) }}
                >
                  <Plus className="h-4 w-4 ml-1" />حصة في اليوم ده
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Button variant="outline" className="min-h-[38px] w-full border-dashed" onClick={props.onAddDay}>
        <CalendarPlus className="h-4 w-4 ml-1" />{props.addDayLabel}
      </Button>
    </>
  )
}

export function GradesSchedulePanel() {
  var siteConfig = useAppStore(function (s) { return s.siteConfig })
  var configLoaded = useAppStore(function (s) { return s.configLoaded })

  // ===== القسم أ: الصفوف الدراسية =====
  var [grades, setGrades] = useState<GradeItem[]>(function () { return gradesFromConfig(siteConfig) })
  // نسخة من الأسماء المحفوظة حاليًا — عشان نكشف إعادة التسمية وقت الحفظ
  var [originalGrades, setOriginalGrades] = useState<GradeItem[]>(function () { return gradesFromConfig(siteConfig) })
  var [savingGrades, setSavingGrades] = useState(false)
  var gradesDirtyRef = useRef(false)

  // ===== القسم ب: مواعيد السنتر =====
  var [schedule, setSchedule] = useState<DaySchedule[]>(function () { return parseSchedule(siteConfig) })
  var [savingSchedule, setSavingSchedule] = useState(false)
  var scheduleDirtyRef = useRef(false)

  // ===== (ص7) القسم ج: حصص البرايفت =====
  var [privateSchedule, setPrivateSchedule] = useState<DaySchedule[]>(function () { return parsePrivateSchedule(siteConfig) })
  var [savingPrivate, setSavingPrivate] = useState(false)
  var privateDirtyRef = useRef(false)

  // لو الكونفج مش محمّل في الستور بنجيبه (نفس نمط صفحة /schedule)
  var [configFetchStarted, setConfigFetchStarted] = useState(false)
  useEffect(function () {
    if (configLoaded || configFetchStarted) return
    setConfigFetchStarted(true)
    fetch('/api/config')
      .then(function (r) { return r.json() })
      .then(function (data) {
        useAppStore.getState().setSiteConfig(data || {})
        useAppStore.getState().setConfigLoaded(true)
      })
      .catch(function () { /* صامت */ })
  }, [configLoaded, configFetchStarted])

  // أول ما الكونفج يوصل بنزامن الحالة المحلية مرة واحدة — بس لو
  // المستر مبدأش يعدل (عشان ما نمسحش تعديله لو الكونفج وصل متأخر)
  var hydratedRef = useRef(false)
  useEffect(function () {
    if (hydratedRef.current) return
    if (!configLoaded && !siteConfig.grades_data && !siteConfig.schedule_data && !(siteConfig as any).private_schedule_data) return
    hydratedRef.current = true
    if (!gradesDirtyRef.current) {
      var items = gradesFromConfig(siteConfig)
      setGrades(items)
      setOriginalGrades(items)
    }
    if (!scheduleDirtyRef.current) setSchedule(parseSchedule(siteConfig))
    /* (ص7) ومزامنة حصص البرايفت كمان */
    if (!privateDirtyRef.current) setPrivateSchedule(parsePrivateSchedule(siteConfig))
  }, [configLoaded, siteConfig])

  // ===== تعديل الصفوف =====
  function updateGrade(idx: number, patch: Partial<GradeItem>) {
    gradesDirtyRef.current = true
    setGrades(function (prev) {
      var next = prev.slice()
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  function addGrade() {
    gradesDirtyRef.current = true
    setGrades(function (prev) {
      return prev.concat([{ ar: '', en: '', emoji: '🎓', short: '' }])
    })
  }

  function removeGrade(idx: number) {
    gradesDirtyRef.current = true
    setGrades(function (prev) {
      return prev.filter(function (_, i) { return i !== idx })
    })
  }

  async function saveGrades() {
    // تحقق: كل صف لازم يكون ليه اسم عربي
    for (var i = 0; i < grades.length; i++) {
      if (!grades[i].ar.trim()) {
        toast.error('الصف رقم ' + (i + 1) + ' ناقص اسمه بالعربي — اكتب الاسم أو احذف الصف')
        return
      }
      for (var j = i + 1; j < grades.length; j++) {
        if (grades[i].ar.trim() === grades[j].ar.trim()) {
          toast.error('فيه صفين بنفس الاسم: ' + grades[i].ar.trim() + ' — لازم كل صف ليه اسم مختلف')
          return
        }
      }
    }
    // نكشف إعادة التسمية قبل الحفظ (بنقارن بالأسماء المحفوظة)
    var renames = detectRenames(originalGrades, grades)
    setSavingGrades(true)
    try {
      var value = JSON.stringify(grades.map(function (g) {
        return { ar: g.ar.trim(), en: g.en.trim(), emoji: g.emoji.trim(), short: g.short.trim() }
      }))
      var res = await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'grades_data', value: value }),
      })
      if (!res.ok) throw new Error('save failed')
      // تحديث الكونفج في الستور فورًا (كل شاشات المنصة بتقرأ منه)
      var st = useAppStore.getState()
      st.setSiteConfig({ ...st.siteConfig, grades_data: value })
      setOriginalGrades(grades.map(function (g) { return { ...g } }))
      gradesDirtyRef.current = false
      toast.success('تم حفظ الصفوف الدراسية | Grades saved')
      // نشر إعادة التسمية على كل الطلاب والواجبات والامتحانات
      if (renames.length > 0) {
        try {
          var rr = await fetch('/api/grades/apply-rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ renames: renames }),
          })
          if (rr.ok) {
            toast.success('اسم الصف اتحديث عند كل الطلاب والواجبات', {
              description: renames.map(function (r) { return r.from + ' ← ' + r.to }).join(' | '),
            })
          } else {
            toast.error('الصفوف اتحفظت لكن نشر إعادة التسمية فشل — جرب احفظ تاني')
          }
        } catch (e) {
          toast.error('الصفوف اتحفظت لكن نشر إعادة التسمية فشل — جرب احفظ تاني')
        }
      }
    } catch (e) {
      toast.error('خطأ في حفظ الصفوف')
    }
    setSavingGrades(false)
  }

  // ===== تعديل المواعيد — (ص7) المعممة على الجدولين (عادي + برايفت) =====
  function makeDayHandlers(
    setter: React.Dispatch<React.SetStateAction<DaySchedule[]>>,
    dirtyRef: React.MutableRefObject<boolean>
  ) {
    function updateDay(idx: number, day: string) {
      dirtyRef.current = true
      setter(function (prev) {
        return prev.map(function (d, i) {
          return i === idx ? { ...d, day: day } : d
        })
      })
    }
    function removeDay(idx: number) {
      dirtyRef.current = true
      setter(function (prev) {
        return prev.filter(function (_, i) { return i !== idx })
      })
    }
    function addDay() {
      dirtyRef.current = true
      setter(function (prev) {
        // نختار أول يوم من الأسبوع مش مستخدم عشان الـ Select يبان معبّي
        var used: Record<string, boolean> = {}
        for (var i = 0; i < prev.length; i++) used[prev[i].day] = true
        var day = ''
        for (var j = 0; j < ARABIC_DAYS.length; j++) {
          if (!used[ARABIC_DAYS[j]]) { day = ARABIC_DAYS[j]; break }
        }
        if (!day) day = ARABIC_DAYS[prev.length % ARABIC_DAYS.length]
        return prev.concat([{ day: day, slots: [{ time: '', grade: '' }] }])
      })
    }
    function updateSlot(dayIdx: number, slotIdx: number, patch: Partial<ScheduleSlot>) {
      dirtyRef.current = true
      setter(function (prev) {
        return prev.map(function (d, i) {
          if (i !== dayIdx) return d
          var slots = d.slots.slice()
          slots[slotIdx] = { ...slots[slotIdx], ...patch }
          return { ...d, slots: slots }
        })
      })
    }
    function addSlot(dayIdx: number) {
      dirtyRef.current = true
      setter(function (prev) {
        return prev.map(function (d, i) {
          return i === dayIdx ? { ...d, slots: d.slots.concat([{ time: '', grade: '' }]) } : d
        })
      })
    }
    function removeSlot(dayIdx: number, slotIdx: number) {
      dirtyRef.current = true
      setter(function (prev) {
        return prev.map(function (d, i) {
          if (i !== dayIdx) return d
          return { ...d, slots: d.slots.filter(function (_, si) { return si !== slotIdx }) }
        })
      })
    }
    return { updateDay: updateDay, removeDay: removeDay, addDay: addDay, updateSlot: updateSlot, addSlot: addSlot, removeSlot: removeSlot }
  }

  var regHandlers = makeDayHandlers(setSchedule, scheduleDirtyRef)
  var privHandlers = makeDayHandlers(setPrivateSchedule, privateDirtyRef)

  // خيارات الصف في حصص الجدول = الصفوف الحالية في القسم أ
  // (+ أي صف قديم مستخدم في الجدولين مش موجود في القايمة عشان ميختفيش)
  var slotGradeOptions: GradeItem[] = grades.filter(function (g) { return g.ar.trim() !== '' })
  var knownGrades: Record<string, boolean> = {}
  for (var gIdx = 0; gIdx < slotGradeOptions.length; gIdx++) knownGrades[slotGradeOptions[gIdx].ar] = true
  var extraOptions: GradeItem[] = []
  function collectExtra(days: DaySchedule[]) {
    for (var dIdx = 0; dIdx < days.length; dIdx++) {
      var daySlots = days[dIdx].slots
      for (var sIdx = 0; sIdx < daySlots.length; sIdx++) {
        var gr = daySlots[sIdx].grade.trim()
        if (gr && !knownGrades[gr]) {
          knownGrades[gr] = true
          extraOptions.push({ ar: gr, en: '', emoji: '', short: '' })
        }
      }
    }
  }
  collectExtra(schedule)
  collectExtra(privateSchedule) /* (ص7) وصفود البرايفت كمان */
  slotGradeOptions = slotGradeOptions.concat(extraOptions)

  async function saveSchedule() {
    // تحقق: كل يوم ليه اسم وكل حصة ليه صف
    for (var i = 0; i < schedule.length; i++) {
      if (!schedule[i].day.trim()) {
        toast.error('فيه يوم من غير اسم — اختار اليوم من القايمة أو احذف الكارت')
        return
      }
      for (var j = 0; j < schedule[i].slots.length; j++) {
        if (!schedule[i].slots[j].grade.trim()) {
          toast.error('في حصة من غير صف في يوم ' + schedule[i].day + ' — اختار الصف أو احذف الحصة')
          return
        }
      }
    }
    setSavingSchedule(true)
    try {
      var value = JSON.stringify(schedule.map(function (d) {
        return {
          day: d.day,
          slots: d.slots.map(function (s) { return { time: s.time.trim(), grade: s.grade.trim() } }),
        }
      }))
      var res = await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'schedule_data', value: value }),
      })
      if (!res.ok) throw new Error('save failed')
      var st = useAppStore.getState()
      st.setSiteConfig({ ...st.siteConfig, schedule_data: value })
      scheduleDirtyRef.current = false
      toast.success('تم حفظ مواعيد السنتر | Schedule saved')
    } catch (e) {
      toast.error('خطأ في حفظ المواعيد')
    }
    setSavingSchedule(false)
  }

  /* (ص7) حفظ حصص البرايفت — نفس منطق المواعيد العادية بمفتاح تاني.
     لو القايمة فضيت خالص بنحفظ '' عشان القسم يختفي من صفحة الطلاب */
  async function savePrivateSchedule() {
    for (var i = 0; i < privateSchedule.length; i++) {
      if (!privateSchedule[i].day.trim()) {
        toast.error('فيه يوم برايفت من غير اسم — اختار اليوم أو احذف الكارت')
        return
      }
      for (var j = 0; j < privateSchedule[i].slots.length; j++) {
        if (!privateSchedule[i].slots[j].grade.trim()) {
          toast.error('في حصة برايفت من غير صف في يوم ' + privateSchedule[i].day + ' — اختار الصف أو احذف الحصة')
          return
        }
      }
    }
    setSavingPrivate(true)
    try {
      var value = privateSchedule.length === 0
        ? ''
        : JSON.stringify(privateSchedule.map(function (d) {
            return {
              day: d.day,
              slots: d.slots.map(function (s) { return { time: s.time.trim(), grade: s.grade.trim() } }),
            }
          }))
      var res = await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'private_schedule_data', value: value }),
      })
      if (!res.ok) throw new Error('save failed')
      var st = useAppStore.getState()
      ;(st.setSiteConfig as any)({ ...st.siteConfig, private_schedule_data: value })
      privateDirtyRef.current = false
      if (privateSchedule.length === 0) {
        toast.success('اتمسحت حصص البرايفت — القسم هيختفي من صفحة الطلاب')
      } else {
        toast.success('تم حفظ حصص البرايفت | Private classes saved')
      }
    } catch (e) {
      toast.error('خطأ في حفظ حصص البرايفت')
    }
    setSavingPrivate(false)
  }

  return (
    <div className="space-y-6">
      {/* ================= القسم أ: الصفوف الدراسية ================= */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              الصفوف الدراسية | Grades
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="min-h-[36px]" onClick={addGrade}>
                <Plus className="h-4 w-4 ml-1" />إضافة صف
              </Button>
              <Button size="sm" className="min-h-[36px]" onClick={saveGrades} disabled={savingGrades}>
                {savingGrades ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingGrades ? 'جاري الحفظ...' : 'حفظ الصفوف'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            الإيموجي بيظهر جنب اسم الصف في كل المنصة (فوق الصورة). لو غيرت اسم صف بالعربي واحفظت،
            الاسم الجديد بيتنشر تلقائيًا على كل الطلاب والفيديوهات والواجبات والامتحانات.
          </p>
          {grades.map(function (g, idx) {
            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5"
              >
                <Input
                  value={g.emoji}
                  onChange={function (e) { updateGrade(idx, { emoji: e.target.value }) }}
                  placeholder="6️⃣"
                  maxLength={4}
                  title="إيموجي الصف — اللي بيظهر فوق الصورة"
                  className="w-14 text-center text-lg px-1 min-h-[38px]"
                />
                <Input
                  value={g.ar}
                  onChange={function (e) { updateGrade(idx, { ar: e.target.value }) }}
                  placeholder="الاسم بالعربي"
                  className="flex-1 min-w-[150px] min-h-[38px]"
                />
                <Input
                  value={g.en}
                  onChange={function (e) { updateGrade(idx, { en: e.target.value }) }}
                  placeholder="English name"
                  dir="ltr"
                  className="flex-1 min-w-[120px] min-h-[38px]"
                />
                <Input
                  value={g.short}
                  onChange={function (e) { updateGrade(idx, { short: e.target.value }) }}
                  placeholder="G6"
                  dir="ltr"
                  title="الكود القصير"
                  className="w-20 min-h-[38px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  onClick={function () { removeGrade(idx) }}
                  title="حذف الصف"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
          {grades.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              مفيش صفوف — اضغط «إضافة صف» وابدأ القايمة
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================= القسم ب: مواعيد السنتر ================= */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              مواعيد السنتر | Center Schedule
            </span>
            <Button size="sm" className="min-h-[36px]" onClick={saveSchedule} disabled={savingSchedule}>
              {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingSchedule ? 'جاري الحفظ...' : 'حفظ المواعيد'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            نفس الجدول ده بيظهر للطلاب في صفحة «مواعيد السنتر». تقدر تزوّد يوم أو تحذف يوم،
            وتزوّد حصة أو تحذف حصة في أي يوم — واختار الصف من قايمة الصفوف اللي فوق.
          </p>
          <DayEditorList
            days={schedule}
            gradeOptions={slotGradeOptions}
            onUpdateDay={regHandlers.updateDay}
            onRemoveDay={regHandlers.removeDay}
            onAddDay={regHandlers.addDay}
            onUpdateSlot={regHandlers.updateSlot}
            onAddSlot={regHandlers.addSlot}
            onRemoveSlot={regHandlers.removeSlot}
            addDayLabel="إضافة يوم"
          />
        </CardContent>
      </Card>

      {/* ================= (ص7) القسم ج: حصص البرايفت ================= */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              حصص البرايفت | Private Classes
            </span>
            <Button size="sm" className="min-h-[36px]" onClick={savePrivateSchedule} disabled={savingPrivate}>
              {savingPrivate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingPrivate ? 'جاري الحفظ...' : 'حفظ حصص البرايفت'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            نفس شكل الحصص العادية بالظبط بس بتظهر للطلاب في قسم «حصص البرايفت» في آخر صفحة مواعيد السنتر
            (الطالب يدوس عليها تظهر له كل الحصص). لو سيبتها فاضية واحفظت — القسم بيختفي من صفحة الطلاب.
          </p>
          {privateSchedule.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
              <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">مفيش حصص برايفت لسه — ابدأ بإضافة يوم</p>
              <Button variant="outline" className="min-h-[38px] border-dashed" onClick={privHandlers.addDay}>
                <CalendarPlus className="h-4 w-4 ml-1" />إضافة يوم برايفت
              </Button>
            </div>
          ) : (
            <DayEditorList
              days={privateSchedule}
              gradeOptions={slotGradeOptions}
              onUpdateDay={privHandlers.updateDay}
              onRemoveDay={privHandlers.removeDay}
              onAddDay={privHandlers.addDay}
              onUpdateSlot={privHandlers.updateSlot}
              onAddSlot={privHandlers.addSlot}
              onRemoveSlot={privHandlers.removeSlot}
              addDayLabel="إضافة يوم برايفت"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
