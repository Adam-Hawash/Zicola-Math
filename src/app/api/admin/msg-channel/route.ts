// ============================================================
// /api/admin/msg-channel — إعدادات الإرسال التلقائي (MG-2)
// ============================================================
// GET  → إعدادات القناة (المفاتيح السرية متقنّعة — عمرها ما ترجع كاملة)
// POST → حفظ الإعدادات في SiteConfig — المفتاح 'msg_channel'
// القنوات: manual (يدوي واتساب — افتراضي) / sms (بوابة SMS) /
//          waapi (WhatsApp Business API)
// المفاتيح بتتفحص من السيرفر بس في /api/admin/messages/send —
// عمرك ما هتترجع للعميل إلا متقنّعة.
// ============================================================
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'

export const dynamic = 'force-dynamic'

var KEY = 'msg_channel'

function maskSecret(v: any): string {
  var s = String(v || '')
  if (!s) return ''
  if (s.length <= 4) return '••••'
  return '••••••' + s.slice(-3)
}

function readChannel(raw: any) {
  var c = raw && typeof raw === 'object' ? raw : {}
  return {
    channel: c.channel === 'sms' || c.channel === 'waapi' ? c.channel : 'manual',
    provider: String(c.provider || '').slice(0, 60),
    apiUrl: String(c.apiUrl || '').slice(0, 400),
    apiKey: String(c.apiKey || '').slice(0, 300),
    username: String(c.username || '').slice(0, 120),
    password: String(c.password || '').slice(0, 200),
    sender: String(c.sender || '').slice(0, 60),
  }
}

export async function GET() {
  try {
    var row = await db.siteConfig.findUnique({ where: { key: KEY } })
    if (!row || !row.value) return NextResponse.json({ ok: true, channel: readChannel(null), hasSecrets: false })
    var saved = readChannel(JSON.parse(row.value))
    var hasSecrets = !!(saved.apiKey || saved.password)
    return NextResponse.json({
      ok: true,
      hasSecrets: hasSecrets,
      channel: {
        channel: saved.channel,
        provider: saved.provider,
        apiUrl: saved.apiUrl,
        username: saved.username,
        sender: saved.sender,
        apiKey: maskSecret(saved.apiKey),
        password: maskSecret(saved.password),
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: true, channel: readChannel(null), hasSecrets: false })
  }
}

export async function POST(request: NextRequest) {
  try {
    var body = await request.json()
    var cfg = readChannel(body)
    /* لو المستر ساب السر متقنّع زي ما رجع من الـ GET → نحتفظ بالقيمة القديمة */
    if (cfg.apiKey.indexOf('••••') === 0 || cfg.password.indexOf('••••') === 0) {
      var old = await db.siteConfig.findUnique({ where: { key: KEY } })
      if (old && old.value) {
        var savedOld = readChannel(JSON.parse(old.value))
        if (cfg.apiKey.indexOf('••••') === 0) cfg.apiKey = savedOld.apiKey
        if (cfg.password.indexOf('••••') === 0) cfg.password = savedOld.password
      }
    }
    var value = JSON.stringify(cfg)
    await safeWrite(function () {
      return db.siteConfig.upsert({
        where: { key: KEY },
        update: { value: value, updatedAt: new Date() },
        create: { key: KEY, value: value },
      })
    })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('msg-channel save error:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
