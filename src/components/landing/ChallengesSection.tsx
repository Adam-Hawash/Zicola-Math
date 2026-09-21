'use client'

/* (و70) قسم التحديات — طلب المستر حرفيًا:
   «المدرس يرفع فيديو → كل طالب يكتب حله تحت → الحلول تظهر بترتيب ما كتبها الطلاب»
   التحدي بيتضاف من لوحة الأدمن (تاب التحديات) والحلول عامة بترتيب الزمن */

import { useEffect, useState, useCallback } from 'react'
import { Trophy, Send, Loader2, MessageSquareText, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n'
import { toast } from 'sonner'

function youTubeId(u: string): string | null {
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? m[1] : null
}

interface ChallengeData {
  id: string
  title: string
  description: string
  videoUrl: string
  videoType: string
}

interface SolutionData {
  id: string
  studentName: string
  content: string
  createdAt: string
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function ChallengesSection() {
  const T = useT()
  const [challenge, setChallenge] = useState<ChallengeData | null>(null)
  const [solutions, setSolutions] = useState<SolutionData[]>([])
  const [loaded, setLoaded] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/challenges/active', { cache: 'no-store' })
      const d = await r.json()
      setChallenge(d.challenge || null)
      setSolutions(d.solutions || [])
    } catch {
      /* silent */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submit() {
    if (!challenge) return
    if (!name.trim() || name.trim().length < 2) {
      toast.error(T('اكتب اسمك الأول', 'Write your name first'))
      return
    }
    if (!content.trim()) {
      toast.error(T('اكتب حلك الأول', 'Write your solution first'))
      return
    }
    setSending(true)
    try {
      const r = await fetch(`/api/challenges/${challenge.id}/solutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: name.trim(), phone: phone.trim(), content: content.trim() }),
      })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || T('حصلت مشكلة — حاول تاني', 'Something went wrong — try again'))
        return
      }
      toast.success(d.message || T('تم تسجيل حلك ✅', 'Your solution was submitted ✅'))
      setContent('')
      await load()
    } catch {
      toast.error(T('حصلت مشكلة في الاتصال — حاول تاني', 'Connection problem — try again'))
    } finally {
      setSending(false)
    }
  }

  if (!loaded) return null
  if (!challenge) return null

  const yt = youTubeId(challenge.videoUrl || '')

  return (
    <section id="challenges" className="relative py-10 sm:py-14 bg-[#14110D] border-t border-white/5">
      {/* توهج ذهبي خفيف */}
      <div aria-hidden className="pointer-events-none absolute top-0 right-1/4 h-64 w-64 rounded-full bg-[#C49A38]/10 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#C49A38]/15 px-4 py-1.5 text-sm font-medium text-[#E5BE5A] border border-[#C49A38]/20">
            <Trophy className="h-4 w-4" />
            {T('تحديات المستر', 'Teacher Challenges')}
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">{challenge.title}</h2>
          {challenge.description ? (
            <p className="mt-3 text-white/70 leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
          ) : null}
        </div>

        {/* فيديو التحدي */}
        <div className="rounded-2xl overflow-hidden border-2 border-[#C49A38]/30 shadow-2xl bg-black mb-8">
          <div className="aspect-video">
            {yt ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
                title={challenge.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
              />
            ) : (
              <video src={challenge.videoUrl} controls preload="metadata" playsInline className="w-full h-full" />
            )}
          </div>
        </div>

        {/* فورم الحل */}
        <div className="rounded-2xl border border-[#C49A38]/25 bg-white/[0.03] p-4 sm:p-6 mb-8">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#E5BE5A] mb-4">
            <MessageSquareText className="h-5 w-5" />
            {T('اكتب حلك هنا', 'Write your solution here')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={T('اسمك', 'Your name')}
              className="min-h-[44px] bg-black/30 border-white/15 text-white placeholder:text-white/40"
            />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={T('رقم التليفون (اختياري)', 'Phone (optional)')}
              className="min-h-[44px] bg-black/30 border-white/15 text-white placeholder:text-white/40"
              dir="ltr"
            />
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={T('اكتب خطوات حلك بالتفصيل...', 'Write your solution steps...')}
            rows={4}
            className="mt-3 bg-black/30 border-white/15 text-white placeholder:text-white/40"
          />
          <Button
            onClick={submit}
            disabled={sending}
            className="mt-3 min-h-[44px] bg-[#C49A38] hover:bg-[#D4A843] text-white font-bold"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {T('ابعت حلي', 'Submit solution')}
          </Button>
        </div>

        {/* حلول الطلاب — بترتيب ما كتبوها */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
            <Trophy className="h-5 w-5 text-[#E5BE5A]" />
            {T('الحلول بترتيب الوصول', 'Solutions in submission order')}
            <span className="text-sm font-medium text-white/50">({solutions.length})</span>
          </h3>
          {solutions.length === 0 ? (
            <p className="text-white/50 text-sm">{T('لسه مفيش حلول — كن أول واحد يحل!', 'No solutions yet — be the first!')}</p>
          ) : (
            <ol className="space-y-3">
              {solutions.map((s, i) => (
                <li key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-[28px] px-1.5 rounded-full bg-[#C49A38]/20 text-[#E5BE5A] text-sm font-black">
                      <Hash className="h-3 w-3" />
                      {i + 1}
                    </span>
                    <span className="font-bold text-white">{s.studentName}</span>
                    <span className="text-xs text-white/40 mr-auto">{fmtTime(s.createdAt)}</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{s.content}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

export default ChallengesSection
