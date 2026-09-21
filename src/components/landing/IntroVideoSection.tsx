'use client'

/* (و70) الفيديو التعريفي — طلب المستر: «إضافة فيديو تعريفي في الأعلى»
   بيتحكم فيه من لوحة الأدمن (intro_video_url: لينك يوتيوب أو ملف مرفوع)
   ولو فاضي القسم مش بيظهر خالص */

import { useEffect, useState } from 'react'
import { PlayCircle } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useT } from '@/lib/i18n'

function youTubeId(u: string): string | null {
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? m[1] : null
}

export function IntroVideoSection() {
  const T = useT()
  const siteConfig = useAppStore((s) => s.siteConfig)
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(siteConfig?.intro_video_url || '')
  }, [siteConfig])

  if (!url) return null

  const yt = youTubeId(url)
  const isFile = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) || url.startsWith('/api/files/')

  return (
    <section id="intro" className="relative py-10 sm:py-14 bg-[#0F0D0A] border-t border-white/5">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#C49A38]/15 px-4 py-1.5 text-sm font-medium text-[#E5BE5A] border border-[#C49A38]/20">
            <PlayCircle className="h-4 w-4" />
            {T('الفيديو التعريفي', 'Intro Video')}
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
            {T('اتعرف على المنصة في دقائق', 'Get to know the platform in minutes')}
          </h2>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-[#C49A38]/30 shadow-2xl bg-black">
          <div className="aspect-video">
            {yt ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
                title={T('الفيديو التعريفي', 'Intro Video')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
              />
            ) : isFile ? (
              <video src={url} controls preload="metadata" playsInline className="w-full h-full" />
            ) : (
              <video src={url} controls preload="metadata" playsInline className="w-full h-full" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default IntroVideoSection
