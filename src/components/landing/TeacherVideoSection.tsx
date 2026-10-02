'use client'

/* ============================================================
   (Z-4) الفيديو التعريفي عن المستر — طلب المستر حرفيًا:
   «عايز فيديو تعريفي تاني تحت اللي بيقول للطلاب ازاي يستخدموا
   المنصة — يكون عن مستر أحمد شعبان، قبل قسم المعرض، زي معلومات
   عن المستر».
   - المفتاح في SiteConfig: teacher_video_url (نفس منطق intro_video_url)
   - لينك (يوتيوب/درايف/فيميو/ستريمابل/أرشايف) → iframe embed
   - ملف مرفوع → /api/files/<mediaId> — مسموح عام من بوابة الفيديو
     لإن القيمة متخزنة في teacher_video_url (زي intro بالظبط)
   - فاضي → القسم مش بيظهر خالص من الـ DOM
   المنطق موحد من src/lib/intro-video.ts — نفس مصدر intro_video.
   ============================================================ */

import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useT } from '@/lib/i18n'
import { introVideoKind, introEmbedSrc } from '@/lib/intro-video'

/* نفس حماية مشاهدة الفيديو بتاعة IntroVideoSection (و102) */
function videoGuardProps() {
  return {
    controlsList: 'nodownload noremoteplayback' as const,
    disablePictureInPicture: true,
    onContextMenu: function (e: React.MouseEvent) { e.preventDefault() },
  }
}

export function TeacherVideoSection() {
  const T = useT()
  const siteConfig = useAppStore((s) => s.siteConfig)
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(String(siteConfig?.teacher_video_url || '').trim())
  }, [siteConfig])

  /* مفيش فيديو → مفيش سكشن أصلًا في الـ DOM (زي IntroVideoSection) */
  const kind = introVideoKind(url)
  if (kind === 'none') return null

  const embedSrc = introEmbedSrc(url)

  return (
    <section id="teacher-video" className="relative py-10 sm:py-14 bg-[#0F0D0A] border-t border-white/5">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#C49A38]/15 px-4 py-1.5 text-sm font-medium text-[#E5BE5A] border border-[#C49A38]/20">
            <GraduationCap className="h-4 w-4" />
            {T('فيديو عن المستر', 'About the Teacher')}
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
            {T('تعرّف على مستر أحمد شعبان', 'Get to know Mr. Ahmed Shaban')}
          </h2>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-[#C49A38]/30 shadow-2xl bg-black">
          <div className="aspect-video">
            {embedSrc ? (
              <iframe
                src={embedSrc}
                title={T('فيديو عن المستر', 'About the Teacher')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
              />
            ) : (
              <video src={url} controls preload="metadata" playsInline {...videoGuardProps()} className="w-full h-full" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TeacherVideoSection
