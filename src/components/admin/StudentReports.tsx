'use client'
/* ============================================================
   (و65) التقارير الجاهزة للطباعة — طلب المستر الحرفي:
   «زرار أطبع ملف PDF تقرير لحاله لكل طالب — الامتحانات اللي قدمها
    والواجبات ونسبة مشاهدة الفيديو» + «ملف لكل الطلاب والفيديوهات
    اللي نازلة وهو ما شافهاش والواجبات اللي قدمها والامتحانات والدرجة»

   مكوّنين:
   - StudentReportDialog: معاينة تقرير طالب واحد + زر «طباعة / حفظ PDF»
   - ClassReportDialog:   معاينة التقرير الشامل لكل الطلاب + الطباعة

   آلية الطباعة: التقرير بيرندر نسخة تانية منفصلة في .pdf-print-root
   (برا الدايلوج خالص) — CSS الطباعة بتخفي كل الصفحة وتوريك النسخة دي
   بس على ورق A4 — فالعربي بيطلع مظبوط 100% وبتقدر تحفظ PDF من
   نافذة الطباعة نفسها («حفظ كـ PDF»).
   ============================================================ */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, X } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { toast } from 'sonner'

/* ===== أدوات تاريخ عربي ===== */
function fmtFull(s?: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch (e) { return '—' }
}
function fmtShort(s?: string | null): string {
  if (!s) return '—'
  try {
    var d = new Date(s)
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric', year: 'numeric' })
  } catch (e) { return '—' }
}

/* ============================================================
   ورقة التقرير — ألوان ثابتة (أبيض/أسود) عشان الطباعة تطلع
   صح في أي وضع (نهاري/ليلي) — عربي RTL دايمًا
   ============================================================ */
function ReportPaper({ title, titleEn, children }: { title: string; titleEn: string; children: any }) {
  return (
    <div dir="rtl" lang="ar" className="rp-paper bg-white text-slate-900">
      <style>{`
        .rp-paper { padding: 24px; font-size: 12px; }
        .rp-paper table { width: 100%; border-collapse: collapse; }
        .rp-paper th { background: #0f172a; color: #fff; padding: 6px 8px; font-size: 11px; text-align: right; font-weight: 700; border: 1px solid #0f172a; }
        .rp-paper td { padding: 6px 8px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 11.5px; }
        .rp-paper tbody tr:nth-child(even) td { background: #f8fafc; }
        .rp-section-title { font-size: 14px; font-weight: 800; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #0f172a; display: flex; justify-content: space-between; align-items: baseline; }
        .rp-section-title small { font-size: 9px; color: #64748b; font-weight: 600; letter-spacing: .5px; }
        .rp-empty { padding: 10px; text-align: center; color: #64748b; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 11px; }
      `}</style>

      {/* هيدر الورقة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f172a', paddingBottom: 10, marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>Zicola Math</p>
          <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0' }}>Zicola in Math — منصة الرياضيات</p>
        </div>
        <div style={{ textAlign: 'left', fontSize: 10.5, color: '#475569' }}>
          <p style={{ margin: 0 }}>تاريخ التقرير: <b>{fmtFull(new Date().toISOString())}</b></p>
        </div>
      </div>

      {/* عنوان التقرير */}
      <div style={{ textAlign: 'center', margin: '6px 0 14px' }}>
        <p style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 9.5, color: '#64748b', margin: '2px 0 0', letterSpacing: 1 }}>{titleEn}</p>
      </div>

      {children}

      {/* فوتر */}
      <div style={{ marginTop: 22, paddingTop: 8, borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#64748b' }}>
        <span>تقرير آلي من منصة Zicola in Math</span>
        <span>Zicola Math</span>
      </div>
    </div>
  )
}

/* كارت ملخص صغير */
function SumCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
      <p style={{ fontSize: 17, fontWeight: 900, margin: 0, color }}>{value}</p>
      <p style={{ fontSize: 10, margin: '2px 0 0', color: '#475569', fontWeight: 700 }}>{label}</p>
      {sub ? <p style={{ fontSize: 9, margin: '1px 0 0', color: '#64748b' }}>{sub}</p> : null}
    </div>
  )
}

/* شريط نسبة المشاهدة */
function PercentBar({ percent }: { percent: number }) {
  var color = percent >= 90 ? '#059669' : percent >= 50 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: percent + '%', height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 800, color, minWidth: 32 }}>{percent}%</span>
    </div>
  )
}

/* ============================================================
   جسم تقرير الطالب الواحد
   ============================================================ */
export type StudentReportData = {
  student: { id: string; name: string; phone: string; grade: string; status?: string; parentName?: string; parentPhone?: string }
  exams: { title: string; score: number; maxScore: number; passed: boolean; submittedAt: string | null }[]
  homework: { title: string; score: number; maxScore: number; submittedAt: string | null }[]
  videos: { id: string; title: string; percent: number; watched: boolean; lastWatchedAt: string | null }[]
  summary: { videosWatched: number; totalVideos: number; avgPercent: number; examsTaken: number; examsPassed: number; avgExamScore: number; hwDone: number; avgHwScore: number }
}

function StudentReportBody({ data }: { data: StudentReportData }) {
  var s = data.student
  var sum = data.summary
  return (
    <div>
      {/* بيانات الطالب */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12 }}><b>الاسم:</b> {s.name}</p>
        <p style={{ margin: 0, fontSize: 12 }}><b>الصف:</b> {s.grade}</p>
        <p style={{ margin: 0, fontSize: 12 }}><b>التليفون:</b> <span dir="ltr">{s.phone || '—'}</span></p>
        {s.parentName ? <p style={{ margin: 0, fontSize: 12 }}><b>ولي الأمر:</b> {s.parentName}{s.parentPhone ? <> <span dir="ltr">({s.parentPhone})</span></> : null}</p> : null}
      </div>

      {/* ملخص سريع */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
        <SumCard
          label="مشاهدة الفيديوهات"
          value={sum.totalVideos > 0 ? `${sum.videosWatched}/${sum.totalVideos}` : '—'}
          sub={`متوسط المشاهدة ${sum.avgPercent}%`}
          color="#7c3aed"
        />
        <SumCard
          label="الامتحانات المقدمة"
          value={String(sum.examsTaken)}
          sub={`متوسط الدرجة ${sum.avgExamScore} — نجح في ${sum.examsPassed}`}
          color="#b45309"
        />
        <SumCard
          label="الواجبات المقدمة"
          value={String(sum.hwDone)}
          sub={`متوسط الدرجة ${sum.avgHwScore}`}
          color="#047857"
        />
      </div>

      {/* الامتحانات */}
      <div className="rp-section-title"><span>📋 الامتحانات اللي قدمها</span><small>EXAMS</small></div>
      {data.exams.length === 0 ? (
        <p className="rp-empty">لسه ما قدمش أي امتحان</p>
      ) : (
        <table>
          <thead>
            <tr><th style={{ width: '40%' }}>الامتحان</th><th style={{ width: '16%' }}>الدرجة</th><th style={{ width: '14%' }}>النسبة</th><th style={{ width: '14%' }}>النتيجة</th><th style={{ width: '16%' }}>تاريخ التقديم</th></tr>
          </thead>
          <tbody>
            {data.exams.map(function (e, i) {
              var pctv = e.maxScore > 0 ? Math.round((e.score / e.maxScore) * 100) : 0
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{e.title}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap' }}>{e.score} من {e.maxScore}</td>
                  <td style={{ textAlign: 'center' }}>{pctv}%</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: e.passed ? '#059669' : '#dc2626' }}>{e.passed ? '✔ ناجح' : '✘ لم يجتز'}</td>
                  <td style={{ textAlign: 'center' }}>{fmtShort(e.submittedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* الواجبات */}
      <div className="rp-section-title"><span>📝 الواجبات اللي قدمها</span><small>HOMEWORK</small></div>
      {data.homework.length === 0 ? (
        <p className="rp-empty">لسه ما قدمش أي واجب</p>
      ) : (
        <table>
          <thead>
            <tr><th style={{ width: '44%' }}>الواجب</th><th style={{ width: '20%' }}>الدرجة</th><th style={{ width: '16%' }}>النسبة</th><th style={{ width: '20%' }}>تاريخ التسليم</th></tr>
          </thead>
          <tbody>
            {data.homework.map(function (h, i) {
              var pctv = h.maxScore > 0 ? Math.round((h.score / h.maxScore) * 100) : 0
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{h.title}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap' }}>{h.score} من {h.maxScore}</td>
                  <td style={{ textAlign: 'center' }}>{pctv}%</td>
                  <td style={{ textAlign: 'center' }}>{fmtShort(h.submittedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* الفيديوهات */}
      <div className="rp-section-title"><span>🎬 الفيديوهات ونسبة المشاهدة</span><small>VIDEOS</small></div>
      {data.videos.length === 0 ? (
        <p className="rp-empty">مفيش فيديوهات منزلة لصف الطالب ده</p>
      ) : (
        <table>
          <thead>
            <tr><th style={{ width: '44%' }}>الفيديو</th><th style={{ width: '28%' }}>نسبة المشاهدة</th><th style={{ width: '12%' }}>الحالة</th><th style={{ width: '16%' }}>آخر مشاهدة</th></tr>
          </thead>
          <tbody>
            {data.videos.map(function (v, i) {
              return (
                <tr key={v.id || i}>
                  <td style={{ fontWeight: 600 }}>{v.title}</td>
                  <td><PercentBar percent={v.percent} /></td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: v.watched ? '#059669' : '#dc2626' }}>{v.watched ? '✔ شافه' : '✘ لسه'}</td>
                  <td style={{ textAlign: 'center' }}>{fmtShort(v.lastWatchedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ============================================================
   جسم التقرير الشامل — كل الطلاب في ملف واحد
   ============================================================ */
export type ClassStudentRow = {
  id: string; name: string; phone: string; grade: string
  exams: { title: string; score: number; maxScore: number; passed: boolean }[]
  avgExam: number
  hw: { title: string; score: number; maxScore: number }[]
  videosTotal: number; videosWatched: number; unwatched: string[]
}
export type ClassReportData = { students: ClassStudentRow[] }

function ClassReportBody({ data, gradeLabel }: { data: ClassReportData; gradeLabel: string }) {
  var students = data.students || []
  /* تجميع حسب الصف (لو التقرير لكل الصفوف) */
  var groups: { grade: string; students: ClassStudentRow[] }[] = []
  students.forEach(function (s) {
    var g = s.grade || 'بدون صف'
    var last = groups.length > 0 ? groups[groups.length - 1] : null
    if (last && last.grade === g) last.students.push(s)
    else groups.push({ grade: g, students: [s] })
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 12px', marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 12 }}><b>الصف:</b> {gradeLabel || 'كل الصفوف'}</p>
        <p style={{ margin: 0, fontSize: 12 }}><b>عدد الطلاب:</b> {students.length}</p>
      </div>

      {students.length === 0 ? (
        <p className="rp-empty">مفيش طلاب مفعلين في النطاق ده</p>
      ) : (
        groups.map(function (g, gi) {
          return (
            <div key={gi}>
              <div className="rp-section-title">
                <span>👥 {g.grade} — {g.students.length} طالب</span>
                <small>GRADE REPORT</small>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>الطالب</th>
                    <th style={{ width: '31%' }}>🎬 الفيديوهات اللي مش شافهاش</th>
                    <th style={{ width: '24%' }}>📝 الواجبات المقدمة</th>
                    <th style={{ width: '30%' }}>📋 الامتحانات والدرجات</th>
                  </tr>
                </thead>
                <tbody>
                  {g.students.map(function (s) {
                    return (
                      <tr key={s.id}>
                        <td>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 11.5 }}>{s.name}</p>
                          <p style={{ margin: 0, fontSize: 9.5, color: '#64748b' }} dir="ltr">{s.phone}</p>
                        </td>
                        <td>
                          <p style={{ margin: '0 0 3px', fontSize: 10.5 }}>
                            <b style={{ color: s.videosWatched >= s.videosTotal && s.videosTotal > 0 ? '#059669' : '#b91c1c' }}>
                              شاف {s.videosWatched} من {s.videosTotal}
                            </b>
                          </p>
                          {s.unwatched.length === 0 ? (
                            <p style={{ margin: 0, fontSize: 10, color: '#059669', fontWeight: 700 }}>✔ شاف كل الفيديوهات</p>
                          ) : (
                            <ul style={{ margin: 0, paddingRight: 14, fontSize: 10, lineHeight: 1.5 }}>
                              {s.unwatched.map(function (t, ti) { return <li key={ti}>{t}</li> })}
                            </ul>
                          )}
                        </td>
                        <td>
                          {s.hw.length === 0 ? (
                            <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>ما قدمش واجبات</p>
                          ) : (
                            <ul style={{ margin: 0, paddingRight: 14, fontSize: 10, lineHeight: 1.5 }}>
                              {s.hw.map(function (h, hi) {
                                return <li key={hi}>{h.title}: <b>{h.score} من {h.maxScore}</b></li>
                              })}
                            </ul>
                          )}
                        </td>
                        <td>
                          {s.exams.length === 0 ? (
                            <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>ما قدمش امتحانات</p>
                          ) : (
                            <>
                              <ul style={{ margin: 0, paddingRight: 14, fontSize: 10, lineHeight: 1.5 }}>
                                {s.exams.map(function (e, ei) {
                                  return (
                                    <li key={ei}>
                                      {e.title}: <b style={{ color: e.passed ? '#059669' : '#dc2626' }}>{e.score} من {e.maxScore}</b> {e.passed ? '✔' : '✘'}
                                    </li>
                                  )
                                })}
                              </ul>
                              <p style={{ margin: '3px 0 0', fontSize: 9.5, color: '#475569' }}>المتوسط: <b>{s.avgExam}</b></p>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </div>
  )
}

/* ============================================================
   دايلوج معاينة موحّد — المحتوى + زر الطباعة
   (النسخة المطبوعة بتترندر في .pdf-print-root برا الدايلوج)
   ============================================================ */
function ReportPreviewDialog({
  open, onOpenChange, title, children,
}: { open: boolean; onOpenChange: (v: boolean) => void; title: string; children: any }) {
  var T = useT()
  /* الطباعة = نافذة طباعة المتصفح (اختار «حفظ كـ PDF» للتحميل) */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            🖨️ {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          {T('دي معاينة التقرير — دوس «طباعة / حفظ PDF» واختار «حفظ كـ PDF» من نافذة الطباعة عشان تحمّل الملف على جهازك.', 'This is a preview — press Print and choose "Save as PDF" to download the file.')}
        </p>
        {/* المعاينة على الشاشة */}
        <div className="max-h-[58vh] overflow-y-auto custom-scrollbar rounded-lg border bg-white">
          {children}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] text-muted-foreground">{T('التقرير بيطلع A4 عربي جاهز للطبع أو الإرسال لولي الأمر.', 'A4 Arabic report, ready to print or send.')}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}><X className="h-4 w-4" />{T('إغلاق', 'Close')}</Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />{T('طباعة / حفظ PDF', 'Print / Save PDF')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* حالة تحميل موحدة */
function LoadingBox() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">جاري تجميع بيانات التقرير…</p>
    </div>
  )
}

/* بوابة الطباعة — التقرير الحقيقي المخصص للورق (برا كل عناصر الشاشة) */
function PrintPortal({ children }: { children: any }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="pdf-print-root" aria-hidden="true">{children}</div>,
    document.body
  )
}

/* ============================================================
   (أ) دايلوج تقرير الطالب الواحد
   usage: <StudentReportDialog student={studentOrNull} onOpenChange={fn} />
   ============================================================ */
export function StudentReportDialog({
  student, onOpenChange,
}: {
  student: { id: string; name: string; grade?: string } | null
  onOpenChange: (v: boolean) => void
}) {
  var T = useT()
  const [data, setData] = useState<StudentReportData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(function () {
    if (!student || !student.id) { setData(null); return }
    var alive = true
    setLoading(true); setData(null)
    fetch('/api/admin/reports?type=student&id=' + encodeURIComponent(student.id))
      .then(function (r) { return r.json() })
      .then(function (d) {
        if (!alive) return
        if (d && d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(function () { if (alive) toast.error('تعذر تحميل بيانات التقرير — جرب تاني') })
      .finally(function () { if (alive) setLoading(false) })
    return function () { alive = false }
  }, [student && student.id])

  return (
    <>
      <ReportPreviewDialog
        open={!!student}
        onOpenChange={onOpenChange}
        title={T('تقرير الطالب: ' + (student ? student.name : ''), 'Student Report: ' + (student ? student.name : ''))}
      >
        {loading || !data ? <LoadingBox /> : <ReportPaper title={'تقرير الطالب — ' + data.student.name} titleEn="INDIVIDUAL STUDENT REPORT"><StudentReportBody data={data} /></ReportPaper>}
      </ReportPreviewDialog>
      {/* نسخة الطباعة — بتظهر بس في نافذة الطباعة (CSS @media print) */}
      {!loading && data && student && (
        <PrintPortal>
          <ReportPaper title={'تقرير الطالب — ' + data.student.name} titleEn="INDIVIDUAL STUDENT REPORT"><StudentReportBody data={data} /></ReportPaper>
        </PrintPortal>
      )}
    </>
  )
}

/* ============================================================
   (ب) دايلوج التقرير الشامل لكل الطلاب
   usage: <ClassReportDialog grade="تالتة إعدادي" open onOpenChange />
   grade فاضي = كل الصفوف
   ============================================================ */
export function ClassReportDialog({
  grade, open, onOpenChange,
}: {
  grade: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  var T = useT()
  const [data, setData] = useState<ClassReportData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(function () {
    if (!open) { setData(null); return }
    var alive = true
    setLoading(true); setData(null)
    fetch('/api/admin/reports?type=class&grade=' + encodeURIComponent(grade || ''))
      .then(function (r) { return r.json() })
      .then(function (d) {
        if (!alive) return
        if (d && d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(function () { if (alive) toast.error('تعذر تحميل بيانات التقرير — جرب تاني') })
      .finally(function () { if (alive) setLoading(false) })
    return function () { alive = false }
  }, [open, grade])

  var gradeLabel = grade || T('كل الصفوف', 'All grades')

  return (
    <>
      <ReportPreviewDialog
        open={open}
        onOpenChange={onOpenChange}
        title={T('التقرير الشامل — ' + gradeLabel, 'Full Report — ' + gradeLabel)}
      >
        {loading || !data ? <LoadingBox /> : <ReportPaper title={'التقرير الشامل للطلاب — ' + gradeLabel} titleEn="FULL CLASS REPORT"><ClassReportBody data={data} gradeLabel={gradeLabel} /></ReportPaper>}
      </ReportPreviewDialog>
      {!loading && data && open && (
        <PrintPortal>
          <ReportPaper title={'التقرير الشامل للطلاب — ' + gradeLabel} titleEn="FULL CLASS REPORT"><ClassReportBody data={data} gradeLabel={gradeLabel} /></ReportPaper>
        </PrintPortal>
      )}
    </>
  )
}
