'use client'

// ============================================================
// (و52) FIGURE-CROP-EDITOR — محرر قص الرسمات اليدوي
// ============================================================
// الضمان النهائي لـ «الرسومات متلخبطة/ناقصة»: لو أي قص أوتوماتيك طلع غلط،
// المستر يفتح صفحة المصدر نفسها ويحرّك المربع بإيده ويحفظ — الرسمة الجديدة
// تتقص من الصفحة الأصلية بدقة كاملة وترفع مكان القديمة فورًا.
//
// مصدر الصفحة بالترتيب: مستند pdf.js مفتوح → ملف الاستخراج → الملف المخزن
// على السيرفر (sourceMediaId) — أي مصدر يشتغل من غير خطوات إضافية.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openPdf, renderPageToJpeg } from '@/lib/pdf-pages'
import { chunkedUpload } from '@/lib/chunked-upload'

export interface FigureCropTarget {
  qi: number
  kind: 'q' | 'of'
  oi: number
  page: number
  bbox: { x: number; y: number; w: number; h: number } | null
}

interface Props {
  target: FigureCropTarget
  source: { file?: File | null; doc?: any | null }
  sourceMediaId?: string
  onSaved: (url: string, bbox: { x: number; y: number; w: number; h: number }, page: number) => void
  onClose: () => void
}

interface Box { x: number; y: number; w: number; h: number }

function safeBox(b: any): Box | null {
  if (!b || typeof b !== 'object') return null
  var x = Number(b.x), y = Number(b.y), w = Number(b.w), h = Number(b.h)
  if (![x, y, w, h].every(function (n) { return isFinite(n) })) return null
  if (w <= 0.005 || h <= 0.005) return null
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    w: Math.max(0.02, Math.min(1, w)),
    h: Math.max(0.02, Math.min(1, h)),
  }
}

export default function FigureCropEditor({ target, source, sourceMediaId, onSaved, onClose }: Props) {
  var [pageUrl, setPageUrl] = useState<string>('')
  var [loading, setLoading] = useState<boolean>(true)
  var [loadErr, setLoadErr] = useState<string>('')
  var [saving, setSaving] = useState<boolean>(false)
  var [box, setBox] = useState<Box>(function () {
    return safeBox(target.bbox) || { x: 0.15, y: 0.2, w: 0.55, h: 0.45 }
  })
  var dragRef = useRef<null | { type: 'move' | 'resize'; corner: string; startX: number; startY: number; box0: Box }>(null)
  var containerRef = useRef<HTMLDivElement | null>(null)
  var canvasHoldRef = useRef<HTMLCanvasElement | null>(null)

  /* Escape يقفل */
  useEffect(function () {
    var onKey = function (e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [onClose])

  /* تجهيز صورة الصفحة بالجودة العالية + canvas كامل الدقة للقص النهائي */
  useEffect(function () {
    var cancelled = false
    /* (ز40) التعرف على PDF من المحتوى نفسه (أول 5 بايت %PDF-) — بعض الأجهزة
       بترسل الملف من غير امتداد/type فيبقى متنكّر كصورة ويعجز FileReader */
    var looksLikePdf = async function (f: File): Promise<boolean> {
      try {
        if (/\.pdf$/i.test(String(f.name || '')) || f.type === 'application/pdf') return true
        var head = await f.slice(0, 5).text()
        if (String(head).indexOf('%PDF-') === 0) return true
      } catch (e) {}
      return false
    }
    var renderFromFile = async function (f: File, page: number): Promise<string> {
      var isPdf = await looksLikePdf(f)
      if (isPdf) {
        var opened = await openPdf(f)
        var n = Math.max(1, Math.min(page, opened.numPages || page))
        return await renderPageToJpeg(opened.doc, n, 1800, 0.9)
      }
      return await new Promise<string>(function (resolve, reject) {
        var r = new FileReader()
        r.onload = function () { resolve(String(r.result || '')) }
        r.onerror = function () { reject(new Error('فشل قراءة الصورة')) }
        r.readAsDataURL(f)
      })
    }
    var run = async function () {
      setLoading(true); setLoadErr('')
      try {
        var dataUrl = ''
        var src = source || {}
        /* (ز40) سلسلة مصادر مقاومة للفشل — أي مصدر يفشل يجرب اللي بعده:
           المستند المفتوح → الملف الأصلي → الملف المخزن على السيرفر.
           ده كان سبب «الرسالة الحمراء» في عدّل القص: الملف الكبير بيتقفل
           من الذاكرة بعد الاستخراج (destroy) والمحرر كان بيحاول يرندر منه
           ويفشل من غير ما يجرب الملف — دلوقتي بيجرب كل المصادر بالترتيب */
        var errs: string[] = []
        if (src.doc) {
          try {
            var nDoc = Math.max(1, Math.min(target.page, Number(src.doc.numPages) || target.page))
            dataUrl = await renderPageToJpeg(src.doc, nDoc, 1800, 0.9)
          } catch (eDoc: any) {
            errs.push('المستند المفتوح: ' + String((eDoc && eDoc.message) || eDoc))
          }
        }
        if (!dataUrl && src.file) {
          try {
            dataUrl = await renderFromFile(src.file, target.page)
          } catch (eFile: any) {
            errs.push('الملف المرفوع: ' + String((eFile && eFile.message) || eFile))
          }
        }
        if (!dataUrl && sourceMediaId) {
          try {
            var res = await fetch('/api/files/' + sourceMediaId, { cache: 'no-store' })
            if (!res.ok) throw new Error('السيرفر رجع ' + res.status)
            var blob = await res.blob()
            var isPdfB = String(blob.type || '').indexOf('pdf') !== -1
            var f2 = new File([blob], 'source' + (isPdfB ? '.pdf' : '.jpg'), { type: blob.type || (isPdfB ? 'application/pdf' : 'image/jpeg') })
            dataUrl = await renderFromFile(f2, target.page)
          } catch (eMed: any) {
            errs.push('السيرفر: ' + String((eMed && eMed.message) || eMed))
          }
        }
        if (!dataUrl) {
          throw new Error(errs.length > 0
            ? 'مقدرتش أجهز صفحة المصدر — ' + errs.join(' | ')
            : 'مفيش مصدر متاح للصفحة — استخدم زرار 📷 لرفع الرسمة يدوي')
        }
        if (cancelled || !dataUrl) return
        var img = new Image()
        img.src = dataUrl
        await new Promise<void>(function (resolve, reject) {
          img.onload = function () { resolve() }
          img.onerror = function () { reject(new Error('فشل تحميل صورة الصفحة')) }
        })
        if (cancelled) return
        var c = document.createElement('canvas')
        c.width = img.naturalWidth || img.width
        c.height = img.naturalHeight || img.height
        var cx = c.getContext('2d')
        if (!cx) throw new Error('متصفحك مش مدعم canvas')
        cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height)
        cx.drawImage(img, 0, 0)
        canvasHoldRef.current = c
        setPageUrl(dataUrl)
      } catch (e: any) {
        if (!cancelled) setLoadErr(String((e && e.message) || e))
      }
      if (!cancelled) setLoading(false)
    }
    run()
    return function () { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.page])

  function norm(e: React.PointerEvent): { x: number; y: number } {
    var el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    var r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width))),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / Math.max(1, r.height))),
    }
  }

  function startDrag(e: React.PointerEvent, type: 'move' | 'resize', corner: string) {
    e.preventDefault()
    e.stopPropagation()
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch (eCap) {}
    dragRef.current = { type: type, corner: corner, startX: norm(e).x, startY: norm(e).y, box0: Object.assign({}, box) }
  }

  function onMove(e: React.PointerEvent) {
    var d = dragRef.current
    if (!d) return
    var p = norm(e)
    var dx = p.x - d.startX, dy = p.y - d.startY
    var b0 = d.box0
    if (d.type === 'move') {
      var nx = Math.max(0, Math.min(1 - b0.w, b0.x + dx))
      var ny = Math.max(0, Math.min(1 - b0.h, b0.y + dy))
      setBox({ x: nx, y: ny, w: b0.w, h: b0.h })
    } else {
      var x1 = b0.x, y1 = b0.y, x2 = b0.x + b0.w, y2 = b0.y + b0.h
      if (d.corner.indexOf('w') !== -1) x1 = Math.max(0, Math.min(x2 - 0.02, b0.x + dx))
      if (d.corner.indexOf('e') !== -1) x2 = Math.min(1, Math.max(x1 + 0.02, b0.x + b0.w + dx))
      if (d.corner.indexOf('n') !== -1) y1 = Math.max(0, Math.min(y2 - 0.02, b0.y + dy))
      if (d.corner.indexOf('s') !== -1) y2 = Math.min(1, Math.max(y1 + 0.02, b0.y + b0.h + dy))
      setBox({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })
    }
  }

  function endDrag() { dragRef.current = null }

  var save = async function () {
    if (saving) return
    var c = canvasHoldRef.current
    if (!c) { setLoadErr('صفحة المصدر مش محملة — استنى التحميل أو اقفل وافتح تاني'); return }
    setSaving(true)
    setLoadErr('')
    try {
      /* هامش صغير 1% عشان حروف الرسمة عند الحرف مايتقصش */
      var mX = Math.max(6, Math.round(0.01 * c.width))
      var mY = Math.max(6, Math.round(0.01 * c.height))
      var sx = Math.max(0, Math.floor(box.x * c.width) - mX)
      var sy = Math.max(0, Math.floor(box.y * c.height) - mY)
      var ex = Math.min(c.width, Math.ceil((box.x + box.w) * c.width) + mX)
      var ey = Math.min(c.height, Math.ceil((box.y + box.h) * c.height) + mY)
      var sw = ex - sx, sh = ey - sy
      if (sw < 8 || sh < 8) throw new Error('التحديد صغير جدًا')
      var scale = Math.min(1, 1600 / Math.max(sw, sh))
      var out = document.createElement('canvas')
      out.width = Math.max(8, Math.round(sw * scale))
      out.height = Math.max(8, Math.round(sh * scale))
      var octx = out.getContext('2d')
      if (!octx) throw new Error('متصفحك مش مدعم canvas')
      octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, out.width, out.height)
      octx.imageSmoothingEnabled = true
      octx.imageSmoothingQuality = 'high'
      octx.drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height)
      var blob = await new Promise<Blob | null>(function (resolve) {
        out.toBlob(function (b: Blob | null) { resolve(b) }, 'image/jpeg', 0.92)
      })
      if (!blob) throw new Error('فشل تجهيز صورة القص')
      var f = new File([blob], 'figure-' + Date.now() + '.jpg', { type: 'image/jpeg' })
      var up = await chunkedUpload(f, 'exam-figures')
      if (!up || !up.filePath || !/^\/api\/files\//.test(up.filePath)) throw new Error('فشل رفع الصورة')
      onSaved(up.filePath, { x: box.x, y: box.y, w: box.w, h: box.h }, target.page)
    } catch (e: any) {
      setLoadErr('حصلت مشكلة في الحفظ: ' + String((e && e.message) || e))
    }
    setSaving(false)
  }

  var handles: { c: string; s: string }[] = [
    { c: 'nw', s: 'left-[-7px] top-[-7px] cursor-nwse-resize' },
    { c: 'ne', s: 'right-[-7px] top-[-7px] cursor-nesw-resize' },
    { c: 'sw', s: 'left-[-7px] bottom-[-7px] cursor-nesw-resize' },
    { c: 'se', s: 'right-[-7px] bottom-[-7px] cursor-nwse-resize' },
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-6"
      onMouseDown={function (e) { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-background rounded-xl border shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3 border-b shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-bold">✂️ عدّل قص الرسمة — صفحة {target.page}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">اسحب المربع لنقله، واسحب النقط البنفسجية في الأركان لتحجيمه — لما الرسمة تبقى جوه المربع بالكامل دوس «قص وحفظ»</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose} aria-label="إغلاق">✕</Button>
        </div>
        <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>بيجهز صفحة المصدر بجودة عالية…</span>
            </div>
          )}
          {!loading && loadErr && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
              {loadErr}
              {/* (Z-40d) لو ظهر خطأ، أول حاجة: حدّث الصفحة — أغلب الحالات دي بتتبدى بتحديث المتصفح */}
              <p className="mt-2 text-[11px] font-bold text-foreground/80 bg-muted/60 border border-border rounded-md px-2 py-1.5">
                ⚡ أول حاجة اعملها: حدّث الصفحة كاملة (Ctrl+Shift+R) وافتح «عدّل القص» تاني — لو الرسالة رجعت بعد التحديث ابعت لي سكرين شوت
              </p>
            </div>
          )}
          {!loading && !loadErr && pageUrl && (
            <div
              ref={containerRef}
              className="relative select-none touch-none mx-auto"
              style={{ maxWidth: 720 }}
              onPointerMove={onMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pageUrl} alt={'صفحة ' + target.page + ' — المصدر'} className="w-full rounded-lg border border-border bg-white pointer-events-none" draggable={false} />
              <div
                className="absolute border-2 border-violet-500 bg-violet-500/15 cursor-move rounded-[2px]"
                style={{ left: (box.x * 100) + '%', top: (box.y * 100) + '%', width: (box.w * 100) + '%', height: (box.h * 100) + '%' }}
                onPointerDown={function (e) { startDrag(e, 'move', '') }}
              >
                {handles.map(function (h) {
                  return (
                    <div
                      key={h.c}
                      onPointerDown={function (e) { startDrag(e, 'resize', h.c) }}
                      className={'absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-violet-600 shadow-md ' + h.s}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 p-3 border-t shrink-0">
          <p className="text-[10px] text-muted-foreground flex-1">القص بيتحفظ بجودة عالية (JPEG 92%) وبيوصل للطالب بالشكل ده بالظبط.</p>
          {/* (Z-40d) علامة الإصدار — لو مش شايفها في النافذة يبقى المتصفح شغّل نسخة قديمة محمّلة قبل النشر */}
          <span className="shrink-0 text-[10px] font-bold text-violet-500 bg-violet-500/10 border border-violet-500/30 rounded px-1.5 py-0.5">✓ v40d</span>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || loading || !!loadErr || !pageUrl}>
            {saving ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <span>💾</span>}
            {saving ? 'بيحفظ…' : 'قص وحفظ'}
          </Button>
        </div>
      </div>
    </div>
  )
}
