'use client'

/* ============================================================
   (و70) لوحة التحديات — طلب المستر حرفيًا:
   «المدرس يرفع فيديو → كل طالب يكتب حله تحت → الحلول تظهر بترتيب
   ما كتبها الطلاب» + «إضافة فيديو تعريفي في الأعلى»
   - المستر يعمل تحدي: عنوان + وصف + فيديو (لينك يوتيوب أو ملف مرفوع)
   - تفعيل تحدي واحد في المرة (التفعيل بيقفل اللي قبله)
   - يشوف حلول الطلاب بترتيب الوصول ويمسح أي حل
   - لينك/ملف الفيديو التعريفي (intro_video_url)
   - (Z-4) لينك/ملف فيديو تعريف المستر (teacher_video_url) — تحت فيديو المنصة
   ============================================================ */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useT } from '@/lib/i18n'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Plus, Loader2, Trash2, Power, RefreshCw, Video, Film, Link2, Eye, Upload, CalendarDays, GraduationCap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { chunkedUpload } from '@/lib/chunked-upload'
import { normalizeIntroVideoUrl, introMediaId, introVideoKind, streamableId } from '@/lib/intro-video'
import { ConfigVideoPlayer } from '@/components/landing/ConfigVideoPlayer'

interface ChallengeRow {
  id: string
  title: string
  description: string
  videoUrl: string
  videoType: string
  active: boolean
  solutionsCount: number
  createdAt: string
}

interface SolutionRow {
  id: string
  studentName: string
  phone: string
  content: string
  createdAt: string
}

function youTubeId(u: string): string | null {
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? m[1] : null
}

export function ChallengesPanel() {
  const T = useT()
  const adminId = useAppStore(function (s) { return s.currentAdmin?.id || '' })

  const [challenges, setChallenges] = useState<ChallengeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  /* فورم إنشاء تحدي */
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState<'youtube' | 'file'>('youtube')
  const [activate, setActivate] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  /* حلول تحدي */
  const [solutionsOpen, setSolutionsOpen] = useState<string | null>(null)
  const [solutions, setSolutions] = useState<SolutionRow[]>([])
  const [solutionsLoading, setSolutionsLoading] = useState(false)

  /* ============================================================
     (Z-1) الفيديو التعريفي — إزاي تستخدم المنصة
     خيارين مع بعض من نفس المصدر (SiteConfig: intro_video_url):
      • لينك: يوتيوب / جوجل درايف / فيميو — بيتطبّع لصيغة embed قبل الحفظ
      • رفع من الجهاز: mp4 عبر بنية chunk الموجودة (/api/upload/chunk)
     + عرض الحالة الحالية (لينك ولا ملف + اسمه/تاريخه) + حذف الفيديو
     (الحذف بيفضّي القيمة وبيمسح ملف الـ Media اليتيم لو موجود)
     ============================================================ */
  const [introUrl, setIntroUrl] = useState('')
  const [introSaving, setIntroSaving] = useState(false)
  const [introUploading, setIntroUploading] = useState(false)
  const [introStatus, setIntroStatus] = useState('')
  const [introMeta, setIntroMeta] = useState<{ filename: string; createdAt: string | null; fileSize: number } | null>(null)
  const introFileRef = useRef<HTMLInputElement>(null)
  /* (Z-1) آخر قيمة محفوظة فعليًا على السيرفر — بتفرق عن introUrl (اللي بيتغير
     لحظة الكتابة في الخانة) عشان مسح الملف اليتيم يبص على القيمة المخزنة القديمة:
     المستر يكتب لينك جديد فوق ملف مرفوع → الملف القديم بيتمسح مش يفضل يتيم */
  const savedIntroRef = useRef('')

  /* ============================================================
     (Z-4) الفيديو التعريفي عن المستر — نفس بنية intro بالظبط
     (SiteConfig: teacher_video_url) — بيظهر تحت فيديو «إزاي تستخدم
     المنصة» في الرئيسية وقبل المعرض. فاضي = مخفي خالص.
     ============================================================ */
  const [teacherUrl, setTeacherUrl] = useState('')
  const [teacherSaving, setTeacherSaving] = useState(false)
  const [teacherUploading, setTeacherUploading] = useState(false)
  const [teacherStatus, setTeacherStatus] = useState('')
  const [teacherMeta, setTeacherMeta] = useState<{ filename: string; createdAt: string | null; fileSize: number } | null>(null)
  const teacherFileRef = useRef<HTMLInputElement>(null)
  const savedTeacherRef = useRef('')

  const load = useCallback(async function () {
    if (!adminId) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/challenges?adminId=' + encodeURIComponent(adminId), { cache: 'no-store' })
      const data = await res.json()
      setChallenges(Array.isArray(data.challenges) ? data.challenges : [])
    } catch { /* صامت */ }
    setLoading(false)
  }, [adminId])

  /* ميتاداتا الملف الحالي (اسم/تاريخ) — من /api/files/<id>?meta=1 */
  const refreshIntroMeta = useCallback(function (value: string) {
    var mediaId = introMediaId(value)
    if (!mediaId) { setIntroMeta(null); return }
    var adminIdNow = useAppStore.getState().currentAdmin?.id || ''
    fetch('/api/files/' + mediaId + '?meta=1&adminId=' + encodeURIComponent(adminIdNow))
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (d) {
        if (d && d.filename) setIntroMeta({ filename: d.filename, createdAt: d.createdAt || null, fileSize: Number(d.fileSize || 0) })
        else setIntroMeta(null)
      })
      .catch(function () { setIntroMeta(null) })
  }, [])

  /* (Z-4) ميتاداتا فيديو المستر الحالي — نفس بنية refreshIntroMeta */
  const refreshTeacherMeta = useCallback(function (value: string) {
    var mediaId = introMediaId(value)
    if (!mediaId) { setTeacherMeta(null); return }
    var adminIdNow = useAppStore.getState().currentAdmin?.id || ''
    fetch('/api/files/' + mediaId + '?meta=1&adminId=' + encodeURIComponent(adminIdNow))
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (d) {
        if (d && d.filename) setTeacherMeta({ filename: d.filename, createdAt: d.createdAt || null, fileSize: Number(d.fileSize || 0) })
        else setTeacherMeta(null)
      })
      .catch(function () { setTeacherMeta(null) })
  }, [])

  /* تحميل الفيديو التعريفي من الكونفيج */
  useEffect(function () {
    fetch('/api/config?fresh=' + Date.now())
      .then(function (r) { return r.json() })
      .then(function (d) {
        var v = d && typeof d.intro_video_url === 'string' ? d.intro_video_url : ''
        savedIntroRef.current = v
        setIntroUrl(v)
        refreshIntroMeta(v)
        /* (Z-4) فيديو تعريف المستر من نفس الرد */
        var tv = d && typeof d.teacher_video_url === 'string' ? d.teacher_video_url : ''
        savedTeacherRef.current = tv
        setTeacherUrl(tv)
        refreshTeacherMeta(tv)
      })
      .catch(function () {})
  }, [refreshIntroMeta, refreshTeacherMeta])

  /* مسح ملف الـ Media اليتيم (لينك/ملف جديد استبدل ملف قديم) — زي ما /api/files/[id] بيمسح */
  function removeIntroMediaIfOrphan(oldValue: string) {
    var oldId = introMediaId(oldValue)
    if (!oldId) return
    var adminIdNow = useAppStore.getState().currentAdmin?.id || ''
    fetch('/api/files/' + oldId + '?adminId=' + encodeURIComponent(adminIdNow), { method: 'DELETE' })
      .catch(function () {})
  }

  /* حفظ قيمة جديدة في المفتاح الواحد intro_video_url (القيمة الجديدة تغيب القديمة) */
  async function writeIntroConfig(value: string): Promise<boolean> {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intro_video_url: value }),
    })
    return res.ok
  }

  async function saveIntroLink() {
    if (introSaving || introUploading) return
    var raw = introUrl.trim()
    var normalized = normalizeIntroVideoUrl(raw)
    setIntroSaving(true)
    try {
      var ok = await writeIntroConfig(normalized)
      if (!ok) { toast.error('فشل الحفظ'); return }
      /* لو كان ملف مرفوع واتستبدل بلينك/ملف تاني → نمسح الملف اليتيم
         (المقارنة ضد آخر قيمة محفوظة على السيرفر — مش نص الخانة) */
      var prevSaved = savedIntroRef.current
      if (normalized !== prevSaved) removeIntroMediaIfOrphan(prevSaved)
      savedIntroRef.current = normalized
      setIntroUrl(normalized)
      refreshIntroMeta(normalized)
      if (!normalized) {
        toast.success('الفيديو التعريفي اتشال — القسم اختفى من الصفحة الرئيسية')
      } else {
        toast.success('الفيديو التعريفي اتسجل ✅ — هيظهر فوق في الصفحة الرئيسية')
      }
    } catch { toast.error('فشل الاتصال') }
    setIntroSaving(false)
  }

  /* رفع فيديو من الجهاز — نفس بنية chunk الموجودة بالظبط */
  async function uploadIntroFile(file: File) {
    if (!file) return
    if (file.type && file.type.indexOf('video/') !== 0) {
      toast.error('اختار ملف فيديو (mp4 / webm / mov)')
      return
    }
    setIntroUploading(true)
    setIntroStatus('جاري الرفع...')
    try {
      const result = await chunkedUpload(file, 'videos', function (pct) {
        setIntroStatus('جاري الرفع... ' + pct + '%')
      }, function (msg) { setIntroStatus(msg) })
      setIntroStatus('جاري الحفظ...')
      var ok = await writeIntroConfig(result.filePath)
      if (!ok) { toast.error('الفيديو اترفع لكن الحفظ فشل — جرب تاني'); return }
      /* ملف جديد فوق ملف/لينك قديم → القديم يتسحب لو كان ملف مرفوع */
      var prevSavedFile = savedIntroRef.current
      if (result.filePath !== prevSavedFile) removeIntroMediaIfOrphan(prevSavedFile)
      savedIntroRef.current = result.filePath
      setIntroUrl(result.filePath)
      setIntroMeta({ filename: result.filename || file.name, createdAt: new Date().toISOString(), fileSize: result.size || file.size })
      toast.success('الفيديو اترفع وبقى ظاهر للطلاب ✅')
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع الفيديو — حاول تاني')
    }
    setIntroUploading(false)
    setIntroStatus('')
  }

  async function deleteIntro() {
    if (introSaving || introUploading) return
    if (!introUrl) return
    if (!window.confirm('حذف الفيديو التعريفي؟ القسم هيختفي من الصفحة الرئيسية.')) return
    setIntroSaving(true)
    try {
      var ok = await writeIntroConfig('')
      if (!ok) { toast.error('فشل الحذف'); return }
      /* القيمة المحفوظة على السيرفر هي اللي بيتشال منها الملف اليتيم */
      removeIntroMediaIfOrphan(savedIntroRef.current)
      savedIntroRef.current = ''
      setIntroUrl('')
      setIntroMeta(null)
      toast.success('الفيديو التعريفي اتمسح ✅')
    } catch { toast.error('فشل الاتصال') }
    setIntroSaving(false)
  }

  /* (Z-4) كتابة قيمة فيديو المستر في teacher_video_url — نفس بوابة /api/config */
  async function writeTeacherConfig(value: string): Promise<boolean> {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_video_url: value }),
    })
    return res.ok
  }

  /* (Z-4) مسح ملف فيديو المستر اليتيم — نفس removeIntroMediaIfOrphan */
  function removeTeacherMediaIfOrphan(oldValue: string) {
    var oldId = introMediaId(oldValue)
    if (!oldId) return
    var adminIdNow = useAppStore.getState().currentAdmin?.id || ''
    fetch('/api/files/' + oldId + '?adminId=' + encodeURIComponent(adminIdNow), { method: 'DELETE' })
      .catch(function () {})
  }

  async function saveTeacherLink() {
    if (teacherSaving || teacherUploading) return
    var raw = teacherUrl.trim()
    var normalized = normalizeIntroVideoUrl(raw)
    setTeacherSaving(true)
    try {
      var ok = await writeTeacherConfig(normalized)
      if (!ok) { toast.error('فشل الحفظ'); return }
      var prevSaved = savedTeacherRef.current
      if (normalized !== prevSaved) removeTeacherMediaIfOrphan(prevSaved)
      savedTeacherRef.current = normalized
      setTeacherUrl(normalized)
      refreshTeacherMeta(normalized)
      if (!normalized) {
        toast.success('فيديو المستر اتشال — القسم اختفى من الصفحة الرئيسية')
      } else {
        toast.success('فيديو المستر اتسجل ✅ — هيظهر تحت فيديو المنصة في الرئيسية')
      }
    } catch { toast.error('فشل الاتصال') }
    setTeacherSaving(false)
  }

  /* (Z-4) رفع فيديو المستر — نفس بنية uploadIntroFile */
  async function uploadTeacherFile(file: File) {
    if (!file) return
    if (file.type && file.type.indexOf('video/') !== 0) {
      toast.error('اختار ملف فيديو (mp4 / webm / mov)')
      return
    }
    setTeacherUploading(true)
    setTeacherStatus('جاري الرفع...')
    try {
      const result = await chunkedUpload(file, 'videos', function (pct) {
        setTeacherStatus('جاري الرفع... ' + pct + '%')
      }, function (msg) { setTeacherStatus(msg) })
      setTeacherStatus('جاري الحفظ...')
      var ok = await writeTeacherConfig(result.filePath)
      if (!ok) { toast.error('الفيديو اترفع لكن الحفظ فشل — جرب تاني'); return }
      var prevSavedFile = savedTeacherRef.current
      if (result.filePath !== prevSavedFile) removeTeacherMediaIfOrphan(prevSavedFile)
      savedTeacherRef.current = result.filePath
      setTeacherUrl(result.filePath)
      setTeacherMeta({ filename: result.filename || file.name, createdAt: new Date().toISOString(), fileSize: result.size || file.size })
      toast.success('فيديو المستر اترفع وبقى ظاهر للطلاب ✅')
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع الفيديو — حاول تاني')
    }
    setTeacherUploading(false)
    setTeacherStatus('')
  }

  async function deleteTeacher() {
    if (teacherSaving || teacherUploading) return
    if (!teacherUrl) return
    if (!window.confirm('حذف فيديو تعريف المستر؟ القسم هيختفي من الصفحة الرئيسية.')) return
    setTeacherSaving(true)
    try {
      var ok = await writeTeacherConfig('')
      if (!ok) { toast.error('فشل الحذف'); return }
      removeTeacherMediaIfOrphan(savedTeacherRef.current)
      savedTeacherRef.current = ''
      setTeacherUrl('')
      setTeacherMeta(null)
      toast.success('فيديو المستر اتمسح ✅')
    } catch { toast.error('فشل الاتصال') }
    setTeacherSaving(false)
  }

  const introKind = introVideoKind(introUrl)
  /* (Z-5) أي لينك معروف (يوتيوب/درايف/فيميو/ستريمابل/أرشايف) بيتعاين بالمشغل
     الموحد ConfigVideoPlayer — ستريمابل بيتشغل على مشغلنا من غير براندينج */
  const introIsStreamable = !!streamableId(introUrl)
  const introKindLabel = introKind === 'youtube' ? 'لينك يوتيوب'
    : introKind === 'drive' ? 'لينك جوجل درايف'
    : introKind === 'vimeo' ? 'لينك فيميو'
    : introKind === 'file' ? 'ملف مرفوع من الجهاز'
    : introKind === 'link' ? (introIsStreamable ? 'لينك ستريمابل — بيتشغل على مشغل المنصة' : 'لينك خارجي')
    : ''

  /* (Z-4) نوع فيديو المستر — نفس المنطق */
  const teacherKind = introVideoKind(teacherUrl)
  const teacherIsStreamable = !!streamableId(teacherUrl)
  const teacherKindLabel = teacherKind === 'youtube' ? 'لينك يوتيوب'
    : teacherKind === 'drive' ? 'لينك جوجل درايف'
    : teacherKind === 'vimeo' ? 'لينك فيميو'
    : teacherKind === 'file' ? 'ملف مرفوع من الجهاز'
    : teacherKind === 'link' ? (teacherIsStreamable ? 'لينك ستريمابل — بيتشغل على مشغل المنصة' : 'لينك خارجي')
    : ''

  useEffect(function () { load() }, [load])

  async function pickFile(file: File) {
    if (!file) return
    setUploading(true)
    setUploadStatus('جاري الرفع...')
    try {
      const result = await chunkedUpload(file, 'videos', function (pct) {
        setUploadStatus('جاري الرفع... ' + pct + '%')
      }, function (msg) { setUploadStatus(msg) })
      setVideoUrl(result.filePath)
      setVideoType('file')
      toast.success('الفيديو اترفع ✅')
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع الفيديو — حاول تاني')
    }
    setUploading(false)
    setUploadStatus('')
  }

  async function createChallenge() {
    if (!adminId) { toast.error('مفيش جلسة أدمن'); return }
    if (!title.trim()) { toast.error('اكتب عنوان التحدي'); return }
    if (!videoUrl.trim()) { toast.error(videoType === 'youtube' ? 'حط لينك اليوتيوب' : 'ارفع ملف الفيديو'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, title: title.trim(), description: desc.trim(), videoUrl: videoUrl.trim(), videoType, active: activate }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل الحفظ'); return }
      toast.success(data.message || 'تم ✅')
      setTitle(''); setDesc(''); setVideoUrl(''); setVideoType('youtube'); setActivate(true)
      await load()
    } catch { toast.error('فشل الاتصال — حاول تاني') }
    setSaving(false)
  }

  async function toggleActive(c: ChallengeRow) {
    if (!adminId) return
    try {
      const res = await fetch('/api/admin/challenges/' + c.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, active: !c.active }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل التفعيل'); return }
      toast.success(c.active ? 'التحدي اتقفل' : 'التحدي اتفعل وأصبح ظاهر للطلاب ✅')
      await load()
    } catch { toast.error('فشل الاتصال') }
  }

  async function deleteChallenge(c: ChallengeRow) {
    if (!adminId) return
    if (!window.confirm('مسح تحدي "' + c.title + '" نهائيًا مع كل الحلول؟')) return
    try {
      const res = await fetch('/api/admin/challenges/' + c.id + '?adminId=' + encodeURIComponent(adminId), { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل المسح'); return }
      toast.success('التحدي اتمسح ✅')
      await load()
    } catch { toast.error('فشل الاتصال') }
  }

  async function openSolutions(challengeId: string) {
    setSolutionsOpen(challengeId)
    setSolutionsLoading(true)
    try {
      const res = await fetch('/api/admin/challenges/solutions/' + challengeId + '?adminId=' + encodeURIComponent(adminId), { cache: 'no-store' })
      const data = await res.json()
      setSolutions(Array.isArray(data.solutions) ? data.solutions : [])
    } catch { setSolutions([]) }
    setSolutionsLoading(false)
  }

  async function deleteSolution(id: string) {
    if (!window.confirm('مسح هذا الحل نهائيًا؟')) return
    try {
      const res = await fetch('/api/admin/challenges/solutions/' + id + '?adminId=' + encodeURIComponent(adminId), { method: 'DELETE' })
      if (!res.ok) { toast.error('فشل المسح'); return }
      toast.success('الحل اتمسح ✅')
      if (solutionsOpen) await openSolutions(solutionsOpen)
    } catch { toast.error('فشل الاتصال') }
  }

  const activeChallenge = challenges.find(function (c) { return c.active })

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* (Z-1) الفيديو التعريفي — إزاي تستخدم المنصة */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold text-base sm:text-lg">
              <Eye className="h-5 w-5 text-primary" />
              الفيديو التعريفي — إزاي تستخدم المنصة
            </h3>
            {introKind !== 'none' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={deleteIntro}
                disabled={introSaving || introUploading}
                className="min-h-[36px] hover:bg-red-500/10 text-red-600 border-red-200"
              >
                {introSaving && !introUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                حذف الفيديو
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            خيارين — لينك أو رفع من الجهاز. لو فاضي الاتنين القسم مش هيظهر للطلاب خالص.
          </p>

          {/* الحالة الحالية */}
          {introKind !== 'none' ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white text-[11px] font-black px-2 py-0.5">
                  ● الحالة الحالية
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[11px] font-bold px-2 py-0.5">
                  {introKind === 'file' ? <Film className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                  {introKindLabel}
                </span>
                {introKind === 'file' ? (
                  <span className="text-xs font-bold truncate max-w-full">
                    {introMeta?.filename || 'فيديو مرفوع'}
                    {introMeta?.createdAt ? <span className="text-muted-foreground font-normal"> — {new Date(introMeta.createdAt).toLocaleDateString('ar-EG')}</span> : null}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground truncate max-w-full" dir="ltr">{introUrl}</span>
                )}
              </div>
              {/* معاينة سريعة — المشغل الموحد (ستريمابل بيتشغل على مشغلنا كمان) */}
              <div className="aspect-video max-h-44 overflow-hidden rounded-lg bg-black">
                <ConfigVideoPlayer url={introUrl} title="معاينة الفيديو التعريفي" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              مفيش فيديو حاليًا — القسم مخفي تمامًا عن الطلاب. حط لينك أو ارفع ملف وسيبه يظهر.
            </div>
          )}

          {/* الخيار الأول: لينك */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-bold">
              <Link2 className="h-4 w-4 text-primary" />
              الخيار الأول: لينك (يوتيوب / جوجل درايف / فيميو)
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={introUrl}
                onChange={function (e) { setIntroUrl(e.target.value) }}
                placeholder="https://www.youtube.com/watch?v=... أو لينك درايف أو فيميو"
                className="min-h-[44px]"
                dir="ltr"
              />
              <Button onClick={saveIntroLink} disabled={introSaving || introUploading} className="min-h-[44px] font-bold shrink-0">
                {introSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                حفظ اللينك
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">لينك اليوتيوب/الدرايف/فيميو بيتحول أوتوماتيك لصيغة تشغيل جوه المنصة.</p>
          </div>

          {/* الخيار التاني: رفع من الجهاز */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-bold">
              <Upload className="h-4 w-4 text-primary" />
              الخيار التاني: رفع فيديو من الجهاز (mp4)
            </Label>
            <input
              ref={introFileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
              className="hidden"
              onChange={function (e) { const f = e.target.files?.[0]; if (f) uploadIntroFile(f); e.target.value = '' }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={function () { introFileRef.current?.click() }}
                disabled={introUploading || introSaving}
                className="min-h-[44px]"
              >
                {introUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                {introUploading ? (introStatus || 'جاري الرفع...') : 'اختار فيديو وارفعه'}
              </Button>
              {introKind === 'file' && !introUploading ? <span className="text-xs text-emerald-600 font-bold">✅ الفيديو المرفوع هو المعروض دلوقتي</span> : null}
            </div>
            {introUploading && introStatus ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" /> {introStatus}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">الرفع بنفس نظام المنصة (أجزاء 2MB) — يدعم الفيديوهات الكبيرة، والفيديو بيتعرض تحت عنوان «الفيديو التعريفي» فوق في الرئيسية.</p>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* (Z-4) الفيديو التعريفي عن المستر — تحت فيديو المنصة وقبل المعرض */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold text-base sm:text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              الفيديو التعريفي عن المستر
            </h3>
            {teacherKind !== 'none' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={deleteTeacher}
                disabled={teacherSaving || teacherUploading}
                className="min-h-[36px] hover:bg-red-500/10 text-red-600 border-red-200"
              >
                {teacherSaving && !teacherUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                حذف الفيديو
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            بيظهر تحت فيديو «إزاي تستخدم المنصة» في الصفحة الرئيسية وقبل قسم المعرض — فيديو تعريفي عنك أنت. لو فاضي القسم مش هيظهر خالص.
          </p>

          {/* الحالة الحالية */}
          {teacherKind !== 'none' ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white text-[11px] font-black px-2 py-0.5">
                  ● الحالة الحالية
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[11px] font-bold px-2 py-0.5">
                  {teacherKind === 'file' ? <Film className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                  {teacherKindLabel}
                </span>
                {teacherKind === 'file' ? (
                  <span className="text-xs font-bold truncate max-w-full">
                    {teacherMeta?.filename || 'فيديو مرفوع'}
                    {teacherMeta?.createdAt ? <span className="text-muted-foreground font-normal"> — {new Date(teacherMeta.createdAt).toLocaleDateString('ar-EG')}</span> : null}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground truncate max-w-full" dir="ltr">{teacherUrl}</span>
                )}
              </div>
              {/* معاينة سريعة — المشغل الموحد (ستريمابل بيتشغل على مشغلنا كمان) */}
              <div className="aspect-video max-h-44 overflow-hidden rounded-lg bg-black">
                <ConfigVideoPlayer url={teacherUrl} title="معاينة فيديو المستر" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              مفيش فيديو حاليًا — القسم مخفي تمامًا عن الطلاب. حط لينك أو ارفع ملف وسيبه يظهر.
            </div>
          )}

          {/* الخيار الأول: لينك */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-bold">
              <Link2 className="h-4 w-4 text-primary" />
              الخيار الأول: لينك (يوتيوب / جوجل درايف / فيميو / ستريمابل)
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={teacherUrl}
                onChange={function (e) { setTeacherUrl(e.target.value) }}
                placeholder="https://www.youtube.com/watch?v=... أو لينك درايف أو ستريمابل"
                className="min-h-[44px]"
                dir="ltr"
              />
              <Button onClick={saveTeacherLink} disabled={teacherSaving || teacherUploading} className="min-h-[44px] font-bold shrink-0">
                {teacherSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                حفظ اللينك
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">أي لينك معروف بيتحول أوتوماتيك لصيغة تشغيل جوه المنصة (حتى لينك ستريمابل اللي كان بيبان أسود).</p>
          </div>

          {/* الخيار التاني: رفع من الجهاز */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-bold">
              <Upload className="h-4 w-4 text-primary" />
              الخيار التاني: رفع فيديو من الجهاز (mp4)
            </Label>
            <input
              ref={teacherFileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
              className="hidden"
              onChange={function (e) { const f = e.target.files?.[0]; if (f) uploadTeacherFile(f); e.target.value = '' }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={function () { teacherFileRef.current?.click() }}
                disabled={teacherUploading || teacherSaving}
                className="min-h-[44px]"
              >
                {teacherUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                {teacherUploading ? (teacherStatus || 'جاري الرفع...') : 'اختار فيديو وارفعه'}
              </Button>
              {teacherKind === 'file' && !teacherUploading ? <span className="text-xs text-emerald-600 font-bold">✅ الفيديو المرفوع هو المعروض دلوقتي</span> : null}
            </div>
            {teacherUploading && teacherStatus ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" /> {teacherStatus}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">الرفع بنفس نظام المنصة (أجزاء 2MB) — الفيديو بيتعرض تحت عنوان «تعرّف على مستر أحمد شعبان» في الرئيسية.</p>
          </div>
        </CardContent>
      </Card>

      {/* إنشاء تحدي جديد */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="flex items-center gap-2 font-bold text-base sm:text-lg">
            <Plus className="h-5 w-5 text-primary" />
            تحدي جديد
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>عنوان التحدي *</Label>
              <Input value={title} onChange={function (e) { setTitle(e.target.value) }} placeholder="مثال: تحدي الأسبوع — مسألة الهندسة" className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label>نوع الفيديو</Label>
              <div className="flex gap-2">
                <Button type="button" variant={videoType === 'youtube' ? 'default' : 'outline'} onClick={function () { setVideoType('youtube') }} className="min-h-[44px] flex-1">
                  <Link2 className="h-4 w-4" /> لينك يوتيوب
                </Button>
                <Button type="button" variant={videoType === 'file' ? 'default' : 'outline'} onClick={function () { setVideoType('file') }} className="min-h-[44px] flex-1">
                  <Film className="h-4 w-4" /> ملف فيديو
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>وصف التحدي (اختياري)</Label>
            <Textarea value={desc} onChange={function (e) { setDesc(e.target.value) }} placeholder="اكتب تعليمات التحدي للطلاب..." rows={2} />
          </div>

          {videoType === 'youtube' ? (
            <div className="space-y-1.5">
              <Label>لينك اليوتيوب *</Label>
              <Input value={videoUrl} onChange={function (e) { setVideoUrl(e.target.value); }} placeholder="https://www.youtube.com/watch?v=..." className="min-h-[44px]" dir="ltr" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>ملف الفيديو *</Label>
              <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="hidden" onChange={function (e) { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={function () { fileRef.current?.click() }} disabled={uploading} className="min-h-[44px]">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                  {uploading ? (uploadStatus || 'جاري الرفع...') : 'اختار فيديو وارفعه'}
                </Button>
                {videoUrl && videoType === 'file' ? <span className="text-xs text-emerald-600 font-bold">✅ الفيديو جاهز</span> : null}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={activate} onChange={function (e) { setActivate(e.target.checked) }} className="h-4 w-4 accent-emerald-600" />
            فعّل التحدي فورًا (يظهر للطلاب في الصفحة الرئيسية — ويقفل أي تحدي سابق)
          </label>

          <Button onClick={createChallenge} disabled={saving || uploading} className="min-h-[44px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            إنشاء التحدي
          </Button>
        </CardContent>
      </Card>

      {/* قايمة التحديات */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 font-bold text-base sm:text-lg">
              <Video className="h-5 w-5 text-primary" />
              التحديات ({challenges.length})
            </h3>
            <Button variant="outline" size="sm" onClick={load} className="min-h-[36px]">
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">لسه مفيش تحديات — اعمل أول تحدي من فوق.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {challenges.map(function (c) {
                return (
                  <div key={c.id} className={'rounded-xl border p-3 sm:p-4 ' + (c.active ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={'inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ' + (c.active ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
                        {c.active ? '● مفعّل الآن' : 'مقفول'}
                      </span>
                      <span className="font-bold text-sm sm:text-base">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{c.solutionsCount} حل</span>
                      <div className="ms-auto flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={function () { openSolutions(c.id) }} className="min-h-[36px]">
                          الحلول
                        </Button>
                        <Button variant="outline" size="sm" onClick={function () { toggleActive(c) }} title={c.active ? 'إقفال التحدي' : 'تفعيل التحدي'} className="min-h-[36px]">
                          <Power className={'h-4 w-4 ' + (c.active ? 'text-emerald-600' : '')} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={function () { deleteChallenge(c) }} className="min-h-[36px] hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {c.description ? <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p> : null}
                  </div>
                )
              })}
            </div>
          )}
          {activeChallenge ? (
            <p className="text-xs text-muted-foreground mt-3">التحدي المفعّل بيظهر للطلاب في قسم «تحديات المستر» في الصفحة الرئيسية.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* دايلوج الحلول */}
      <Dialog open={!!solutionsOpen} onOpenChange={function (o) { if (!o) setSolutionsOpen(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              حلول الطلاب — بترتيب الوصول
            </DialogTitle>
          </DialogHeader>
          {solutionsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : solutions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">لسه مفيش حلول على التحدي ده.</p>
          ) : (
            <ol className="space-y-3">
              {solutions.map(function (s, i) {
                return (
                  <li key={s.id} className="rounded-xl border p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-full bg-amber-500/15 text-amber-600 text-xs font-black">{i + 1}</span>
                      <span className="font-bold text-sm">{s.studentName}</span>
                      {s.phone ? <span className="text-[11px] text-muted-foreground" dir="ltr">{s.phone}</span> : null}
                      <button onClick={function () { deleteSolution(s.id) }} className="ms-auto text-red-500 hover:bg-red-500/10 rounded-lg p-1.5" title="مسح الحل">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{s.content}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChallengesPanel
