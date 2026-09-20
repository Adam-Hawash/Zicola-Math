// ============================================================
// /api/admin/player-config — إعدادات شكل المشغل والووترمارك (MG-2)
// ============================================================
// GET  → الكونفج المحفوظ (أو null لو مفيش)
// POST → حفظ الكونفج (JSON مطبّق بـ sanitizePlayerConfig)
// التخزين: جدول SiteConfig — المفتاح 'player_config' — additive
// بالكامل، مفيش أي تعديل على جداول موجودة.
// صفحة المشغل بتقرأ نفس المفتاح عند كل رندر وبتطبق فورًا.
// ============================================================
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'
import { sanitizePlayerConfig } from '@/lib/player-config'

export const dynamic = 'force-dynamic'

var KEY = 'player_config'

export async function GET() {
  try {
    var row = await db.siteConfig.findUnique({ where: { key: KEY } })
    if (!row || !row.value) return NextResponse.json({ ok: true, config: null })
    return NextResponse.json({ ok: true, config: sanitizePlayerConfig(JSON.parse(row.value)) })
  } catch (e) {
    return NextResponse.json({ ok: true, config: null })
  }
}

export async function POST(request: NextRequest) {
  try {
    var body = await request.json()
    var config = sanitizePlayerConfig(body && body.config ? body.config : body)
    var value = JSON.stringify(config)
    await safeWrite(function () {
      return db.siteConfig.upsert({
        where: { key: KEY },
        update: { value: value, updatedAt: new Date() },
        create: { key: KEY, value: value },
      })
    })
    return NextResponse.json({ ok: true, config: config })
  } catch (error: any) {
    console.error('player-config save error:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
