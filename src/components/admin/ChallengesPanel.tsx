'use client'

/* ============================================================
   (و70) لوحة التحديات — طلب المستر حرفيًا:
   «المدرس يرفع فيديو → كل طالب يكتب حله تحت → الحلول تظهر بترتيب
   ما كتبها الطلاب» + «إضافة فيديو تعريفي في الأعلى»
   - المستر يعمل تحدي: عنوان + وصف + فيديو (لينك يوتيوب أو ملف مرفوع)
   - تفعيل تحدي واحد في المرة (التفعيل بيقفل اللي قبله)
   - يشوف حلول الطلاب بترتيب الوصول ويمسح أي حل
   - لينك/ملف الفيديو التعريفي (intro_video_url)
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
import { Trophy, Plus, Loader2, Trash2, Power, RefreshCw, Video, Film, Link2, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { chunkedUpload } from '@/lib/chunked-upload'

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

  /* الفيديو التعريفي */
  const [introUrl, setIntroUrl] = useState('')
  const [introSaving, setIntroSaving] = useState(false)

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

  /* تحميل الفيديو التعريفي من الكونفيج */
  useEffect(function () {
    fetch('/api/config')
      .then(function (r) { return r.json() })
      .then(function (d) { if (d && typeof d.intro_video_url === 'string') setIntroUrl(d.intro_video_url) })
      .catch(function () {})
  }, [])

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

  async function saveIntro() {
    setIntroSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intro_video_url: introUrl.trim() }),
      })
      if (!res.ok) { toast.error('فشل الحفظ'); return }
      toast.success('الفيديو التعريفي اتسجل ✅ — هيظهر فوق في الصفحة الرئيسية')
    } catch { toast.error('فشل الاتصال') }
    setIntroSaving(false)
  }

  const activeChallenge = challenges.find(function (c) { return c.active })

  return (
    <div className="space-y-6">
      {/* الفيديو التعريفي */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-3">
          <h3 className="flex items-center gap-2 font-bold text-base sm:text-lg">
            <Eye className="h-5 w-5 text-primary" />
            الفيديو التعريفي (فوق في الصفحة الرئيسية)
          </h3>
          <p className="text-xs text-muted-foreground">حط لينك يوتيوب أو ارفع ملف فيديو — لو فاضي القسم مش هيظهر للطلاب.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={introUrl}
              onChange={function (e) { setIntroUrl(e.target.value); }}
              placeholder="https://www.youtube.com/watch?v=... أو مسار ملف مرفوع"
              className="min-h-[44px]"
              dir="ltr"
            />
            <Button onClick={saveIntro} disabled={introSaving} className="min-h-[44px] font-bold">
              {introSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              حفظ
            </Button>
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
