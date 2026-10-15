'use client'

// ============================================================
// (2026-و40) BooksManager — تاب «الكتب والملازم» في لوحة الأدمن
// ============================================================
// الأدمن يرفع كتاب/ملزمة PDF (chunkedUpload → Media → /api/files/<id>)
// وبعدها يتسجل صف Book عبر /api/admin/books — والطالب يشوفه في تاب
// «الكتب والملازم» في البورتال (BooksTab).
// الرفع بنفس نظام chunkedUpload بتاع المنصة (أجزاء 2MB + تحقق بايت-ببايت).
// (و43) وضعين: 📁 رفع ملف (≤60MB — بيتخزن في Media) أو 🔗 لينك خارجي
// (الكتب الكبيرة 200MB+ مش بتتخزن في قاعدة البيانات خالص — sourceUrl بس).
// ============================================================

import { useAppStore, gradesFromConfig } from '@/stores/app-store'
import { chunkedUpload } from '@/lib/chunked-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Upload, Loader2, Trash2, FileDown, RefreshCw,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

var MAX_BOOK_MB = 60
var CONFIRM_BOOK_MB = 40

function formatBookSize(bytes: number): string {
  var mb = (bytes || 0) / 1024 / 1024
  if (mb >= 1) return mb.toFixed(1) + ' MB'
  var kb = (bytes || 0) / 1024
  return (kb >= 1 ? kb.toFixed(0) + ' KB' : String(bytes || 0) + ' B')
}

export function BooksManager() {
  const adminId = useAppStore(function (s) { return s.currentAdmin?.id || '' })
  /* (Z-1) القايمة من grades_data (مصدر واحد) — زي باقي لوحات الأدمن */
  const gradeOptions = gradesFromConfig(useAppStore(function (s) { return s.siteConfig }))
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadPct, setUploadPct] = useState(-1)
  const [uploadMsg, setUploadMsg] = useState('')
  /* (و43) وضع الإضافة: file = رفع ملف | link = لينك خارجي */
  const [addMode, setAddMode] = useState<'file' | 'link'>('file')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [grade, setGrade] = useState('')
  /* (2026-و79) تصنيف الكتاب: واجب / أسئلة / الاتنين — طلب المستر الحرفي:
     «أقدر أحدد إن هل ده هيبقى واجب ولا أسئلة ولا الاثنين» */
  const [usage, setUsage] = useState<'both' | 'homework' | 'questions'>('both')
  const [sourceUrl, setSourceUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  /* (2026-ز13) معاينة + أسئلة الكتاب — منقول من و110 (طلب المستر: «أشوفه وأشوف الأسئلة اللي جواه») */
  const [previewBook, setPreviewBook] = useState<any | null>(null)
  const [bookQsBook, setBookQsBook] = useState<any | null>(null)

  var loadBooks = async function () {
    if (!adminId) return
    setLoading(true)
    try {
      var res = await fetch('/api/admin/books?adminId=' + encodeURIComponent(adminId))
      var data = await res.json()
      if (res.ok) setBooks(data.books || [])
      else toast.error(data.error || 'خطأ في تحميل الكتب')
    } catch (e) {
      toast.error('خطأ في الاتصال')
    }
    setLoading(false)
  }

  useEffect(function () {
    if (!adminId) return
    loadBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId])

  /* (و43) حفظ كتاب بلينك خارجي — POST /api/admin/books بـ sourceUrl (من غير ملف) */
  var handleSaveLink = async function () {
    if (!adminId) { toast.error('مفيش جلسة أدمن'); return }
    if (!title.trim()) { toast.error('اكتب عنوان الكتاب الأول'); return }
    if (!sourceUrl.trim()) { toast.error('الصق لينك الكتاب الأول'); return }

    setSaving(true)
    try {
      var res = await fetch('/api/admin/books?adminId=' + encodeURIComponent(adminId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          sourceUrl: sourceUrl.trim(),
          grade: grade,
          usage: usage,
        }),
      })
      var data = await res.json()
      if (res.ok && (data.success || data.book)) {
        toast.success('تم إضافة الكتاب باللينك الخارجي!')
        setTitle(''); setDescription(''); setGrade(''); setSourceUrl('')
        await loadBooks()
      } else {
        toast.error(data.error || 'خطأ في حفظ الكتاب')
      }
    } catch (err: any) {
      toast.error(err.message || 'خطأ في الاتصال')
    }
    setSaving(false)
  }

  var handleUpload = async function () {
    if (!adminId) { toast.error('مفيش جلسة أدمن'); return }
    if (!title.trim()) { toast.error('اكتب عنوان الكتاب الأول'); return }
    if (!file) { toast.error('اختر ملف الكتاب (PDF) الأول'); return }

    var sizeMb = file.size / 1024 / 1024
    if (sizeMb > MAX_BOOK_MB) {
      toast.error('الملف أكبر من ' + MAX_BOOK_MB + ' ميجا — استخدم وضع «لينك خارجي» للكتب الكبيرة')
      return
    }
    if (sizeMb > CONFIRM_BOOK_MB && !window.confirm('الملف ' + sizeMb.toFixed(1) + ' ميجا — الرفع ممكن ياخد وقت. تكمل؟')) {
      return
    }

    setSaving(true)
    setUploadPct(0)
    setUploadMsg('')
    try {
      /* الرفع المجزأ — بيرجّع filePath = /api/files/<mediaId> */
      var up = await chunkedUpload(file, 'books', function (pct) { setUploadPct(pct) }, function (msg) { setUploadMsg(msg) })
      if (!up || !up.filePath) throw new Error('فشل رفع الملف — جرب تاني')

      var res = await fetch('/api/admin/books?adminId=' + encodeURIComponent(adminId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          filePath: up.filePath,
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          sizeBytes: file.size,
          grade: grade,
          usage: usage,
        }),
      })
      var data = await res.json()
      if (res.ok && (data.success || data.book)) {
        toast.success('تم رفع الكتاب بنجاح!')
        setTitle(''); setDescription(''); setGrade(''); setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        await loadBooks()
      } else {
        toast.error(data.error || 'خطأ في حفظ الكتاب')
      }
    } catch (err: any) {
      toast.error(err.message || 'خطأ في الرفع')
    }
    setSaving(false); setUploadPct(-1); setUploadMsg('')
  }

  var handleDelete = async function (b: any) {
    if (!adminId) { toast.error('مفيش جلسة أدمن'); return }
    if (!window.confirm('حذف "' + (b.title || '') + '" نهائيًا؟ الطالب مش هيشوفه تاني.')) return
    try {
      var res = await fetch('/api/admin/books?adminId=' + encodeURIComponent(adminId) + '&id=' + encodeURIComponent(b.id), { method: 'DELETE' })
      var data = await res.json()
      if (res.ok && data.success) {
        toast.success('تم حذف الكتاب')
        setBooks(function (prev) { return prev.filter(function (x) { return x.id !== b.id }) })
      } else {
        toast.error(data.error || 'خطأ في الحذف')
      }
    } catch (e) {
      toast.error('خطأ في الاتصال')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-sky-500" />الكتب والملازم | Books</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ===== (و43) مبدّل الوضع: رفع ملف أو لينك خارجي ===== */}
        <div className="flex gap-2 p-1 rounded-lg bg-muted">
          <button
            type="button"
            onClick={function () { setAddMode('file') }}
            className={"flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all " + (addMode === 'file' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            📁 رفع ملف (للملفات الصغيرة ≤ 60MB)
          </button>
          <button
            type="button"
            onClick={function () { setAddMode('link') }}
            className={"flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all " + (addMode === 'link' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            🔗 لينك خارجي (مستحسن للكتب الكبيرة)
          </button>
        </div>

        {/* ===== نموذج الرفع (ملف) ===== */}
        {addMode === 'file' && (
        <div className="p-4 rounded-xl border-2 border-dashed border-sky-400/40 bg-sky-50 dark:bg-sky-950/20 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">عنوان الكتاب *</Label>
              <Input value={title} onChange={function (e) { setTitle(e.target.value) }} placeholder="مثال: مذكرة الفصل الأول" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الصف (اختياري)</Label>
              <select value={grade} onChange={function (e) { setGrade(e.target.value) }} className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="">كل الصفوف</option>
                {gradeOptions.map(function (g) { return <option key={g.ar} value={g.ar}>{(g.emoji ? g.emoji + ' ' : '') + g.ar}</option> })}
              </select>
            </div>
          </div>
          {/* (2026-و79) الكتاب ده هيستخدم في إيه؟ — واجب / أسئلة / الاتنين */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الكتاب ده هيستخدم في إيه؟</Label>
              <select value={usage} onChange={function (e) { setUsage(e.target.value as 'both' | 'homework' | 'questions') }} className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="both">الواجبات والأسئلة (الاتنين)</option>
                <option value="homework">الواجبات بس</option>
                <option value="questions">الأسئلة بس</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">وصف مختصر (اختياري)</Label>
            <Input value={description} onChange={function (e) { setDescription(e.target.value) }} placeholder="مثال: شرح + مسائل الباب الأول" />
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={function (e) { setFile(e.target.files?.[0] || null) }} />
            <Button type="button" variant="outline" onClick={function () { fileRef.current?.click() }} className="flex-1 border-sky-400/40 text-sky-700 dark:text-sky-400">
              <Upload className="h-4 w-4 ml-2" />{file ? file.name : 'اختر ملف الكتاب (PDF) — أقصى حجم 60 ميجا'}
            </Button>
          </div>
          {file && <p className="text-xs text-muted-foreground text-center">{(file.size / 1024 / 1024).toFixed(1)} MB</p>}
          {uploadPct >= 0 && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-sky-500 transition-all" style={{ width: uploadPct + '%' }} />
              </div>
              {uploadMsg && <p className="text-[11px] text-muted-foreground text-center">{uploadMsg}</p>}
            </div>
          )}
          <Button className="w-full" onClick={handleUpload} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Upload className="h-4 w-4 ml-1" />}
            {saving ? 'جاري الرفع...' : 'رفع الكتاب'}
          </Button>
        </div>
        )}

        {/* ===== (و43) نموذج اللينك الخارجي — من غير رفع ولا تخزين في قاعدة البيانات ===== */}
        {addMode === 'link' && (
        <div className="p-4 rounded-xl border-2 border-dashed border-violet-400/40 bg-violet-50 dark:bg-violet-950/20 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">عنوان الكتاب *</Label>
              <Input value={title} onChange={function (e) { setTitle(e.target.value) }} placeholder="مثال: كتاب الشرح الكامل" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الصف (اختياري)</Label>
              <select value={grade} onChange={function (e) { setGrade(e.target.value) }} className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="">كل الصفوف</option>
                {gradeOptions.map(function (g) { return <option key={g.ar} value={g.ar}>{(g.emoji ? g.emoji + ' ' : '') + g.ar}</option> })}
              </select>
            </div>
          </div>
          {/* (2026-و79) الكتاب ده هيستخدم في إيه؟ — واجب / أسئلة / الاتنين */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الكتاب ده هيستخدم في إيه؟</Label>
              <select value={usage} onChange={function (e) { setUsage(e.target.value as 'both' | 'homework' | 'questions') }} className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="both">الواجبات والأسئلة (الاتنين)</option>
                <option value="homework">الواجبات بس</option>
                <option value="questions">الأسئلة بس</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">وصف مختصر (اختياري)</Label>
            <Input value={description} onChange={function (e) { setDescription(e.target.value) }} placeholder="مثال: 300 صفحة — كامل المنهج" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">اللينك *</Label>
            <Input value={sourceUrl} onChange={function (e) { setSourceUrl(e.target.value) }} placeholder="https://drive.google.com/file/d/... أو أي لينك تحميل مباشر" dir="ltr" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            💡 الكتاب الكبير (200MB+) مش بيتخزن في قاعدة البيانات خالص — بنحفظ اللينك بس والطلاب بيحملوا منه فورًا.
            وللاستخراج منه: نزّله على جهازك وافتحه في وضع (كتاب — صفحات محددة).
          </p>
          <Button className="w-full" onClick={handleSaveLink} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <BookOpen className="h-4 w-4 ml-1" />}
            {saving ? 'جاري الحفظ...' : 'حفظ الكتاب باللينك'}
          </Button>
        </div>
        )}

        {/* ===== القايمة ===== */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">الكتب المتضافة ({books.length})</h3>
          <Button variant="outline" size="sm" onClick={loadBooks} disabled={loading || !adminId}><RefreshCw className={"h-3.5 w-3.5 ml-1" + (loading ? ' animate-spin' : '')} />تحديث</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-sky-500" /></div>
        ) : books.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">مفيش كتب متضافة لسه — ارفع أول كتاب من الفورم اللي فوق</p>
          </div>
        ) : (
          <div className="space-y-2">
            {books.map(function (b: any) {
              /* (و43) كتب اللينك الخارجي — بادج 🔗 بدل الحجم (sizeBytes = 0) */
              var isLinkBook = !!b.sourceUrl
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{b.title}</p>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                      {b.grade && <Badge variant="outline" className="text-[10px]">{b.grade}</Badge>}
                      {/* (2026-و79) بادج تصنيف الكتاب */}
                      {(b as any).usage === 'homework' && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">واجبات</Badge>}
                      {(b as any).usage === 'questions' && <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30">أسئلة</Badge>}
                      {(!(b as any).usage || (b as any).usage === 'both') && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">واجبات + أسئلة</Badge>}
                      {isLinkBook
                        ? <Badge variant="outline" className="text-[10px] border-violet-400/60 text-violet-600 dark:text-violet-400" title={b.sourceUrl}>🔗 لينك خارجي</Badge>
                        : <span>{formatBookSize(b.sizeBytes)}</span>}
                      {b.createdAt && <span>{new Date(b.createdAt).toLocaleDateString('ar-EG')}</span>}
                      {b.description && <span className="truncate max-w-[200px] hidden sm:inline">{b.description}</span>}
                    </div>
                  </div>
                  {/* (2026-ز13) معاينة الكتاب + أسئلته — الكتاب بلينك خارجي بيتفتح عبر /api/books/proxy */}
                  {(() => {
                    var qCount = 0
                    try { var pq = JSON.parse(b.questionsJson || '[]'); if (Array.isArray(pq)) qCount = pq.length } catch (eQm) {}
                    var src2 = b.sourceUrl ? '/api/books/proxy?url=' + encodeURIComponent(b.sourceUrl) : (b.filePath || '')
                    return (
                      <>
                        {qCount > 0 && (
                          <Button variant="outline" size="sm" className="h-8 px-2 text-[10px] font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-400" onClick={function () { setBookQsBook(b) }}>
                            Questions ({qCount})
                          </Button>
                        )}
                        {src2 && (
                          <Button variant="outline" size="sm" className="h-8 gap-1" title="Preview book" onClick={function () { setPreviewBook(b) }} aria-label="Preview">
                            👁 Preview
                          </Button>
                        )}
                      </>
                    )
                  })()}
                  <a
                    href={isLinkBook ? b.sourceUrl : (b.filePath + (b.filePath.indexOf('?') !== -1 ? '&' : '?') + 'dl=1')}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm" className="h-8 gap-1"><FileDown className="h-3.5 w-3.5" />تحميل</Button>
                  </a>
                  {/* (2026-ز13) المسح بقى زرار مكتوب — أيقونة السلة لوحدها كانت مش باينة للمستر */}
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={function () { handleDelete(b) }} title="Delete book">
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* (2026-ز13) معاينة الكتاب — iframe بـ filePath أو /api/books/proxy?url= للينك الخارجي */}
        {previewBook && (function () {
          var pSrc = previewBook.sourceUrl ? '/api/books/proxy?url=' + encodeURIComponent(previewBook.sourceUrl) : (previewBook.filePath || '')
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-6" onMouseDown={function (e) { if (e.target === e.currentTarget) setPreviewBook(null) }}>
              <div className="bg-background rounded-xl border shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col">
                <div className="flex items-center justify-between gap-2 p-3 border-b shrink-0">
                  <p className="text-sm font-bold truncate">👁 Preview: {previewBook.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={pSrc} target="_blank" rel="noreferrer" className="text-xs text-sky-600 dark:text-sky-400 hover:underline px-2">Open in new tab</a>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={function () { setPreviewBook(null) }} aria-label="Close">✕</Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <iframe src={pSrc} title={'Preview ' + (previewBook.title || 'book')} className="w-full h-full rounded-b-xl bg-white" />
                </div>
              </div>
            </div>
          )
        })()}

        {/* (2026-ز13) أسئلة الكتاب المستخرجة — بتظهر بس لما الكتاب نفسه فيه questionsJson */}
        {bookQsBook && (function () {
          var qsList: any[] = []
          try { var pq2 = JSON.parse(bookQsBook.questionsJson || '[]'); if (Array.isArray(pq2)) qsList = pq2 } catch (eQ2) {}
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-6" onMouseDown={function (e) { if (e.target === e.currentTarget) setBookQsBook(null) }}>
              <div className="bg-background rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between gap-2 p-3 border-b shrink-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">📄 Questions «{bookQsBook.title}»</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Latest questions graded from this book — {qsList.length} questions</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={function () { setBookQsBook(null) }} aria-label="Close">✕</Button>
                </div>
                <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                  {qsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No questions extracted from this book yet — extract them from the AI extraction screen and they will show up here</p>
                  ) : qsList.map(function (q: any, qi: number) {
                    return (
                      <div key={qi} className="p-2.5 rounded-lg border border-border bg-muted/30">
                        <p className="text-xs font-semibold leading-relaxed">{(qi + 1) + '. ' + String(q.question || q.q || '')}</p>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {q.options.map(function (op: any, oi: number) {
                              var isCorrect = (typeof q.correct === 'number' && q.correct === oi) || (Array.isArray(q.correct) && q.correct.indexOf(oi) !== -1)
                              return <p key={oi} className={'text-[11px] ' + (isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground')}>{String.fromCharCode(65 + oi) + '. ' + String(op || '')}{isCorrect ? ' ✓' : ''}</p>
                            })}
                          </div>
                        )}
                        {(!Array.isArray(q.options) || q.options.length === 0) && q.modelAnswer ? <p className="text-[11px] text-muted-foreground mt-1">Model answer: {String(q.modelAnswer).substring(0, 200)}</p> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
