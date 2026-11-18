import { NextResponse } from 'next/server'
import { makeLibsqlClient, ensureSchema } from '@/lib/ensure-schema'

/* (ر16) الترميم بقى بمراحل تحت حد كلاود فلير 50 subrequest — كل نداء هنا
   بيكمل مرحلة واحدة (~22 وحدة) ويسجل مكانه، والنداء الجاي بيكمل. الرد
   بيبعت repairProgress — كرر النداءات لحد ما repairProgress.completed=true */
export async function GET() {
  try {
    var client = makeLibsqlClient()
    if (!client) return NextResponse.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 500 })

    var outcome = await ensureSchema(client, { force: true })

    try { await client.close() } catch (e) {}
    var progress = (outcome && outcome.repairProgress) || null
    return NextResponse.json({
      ok: true,
      missing: outcome.missing,
      results: outcome.results,
      skipped: !!(outcome && outcome.skipped),
      repairProgress: progress,
      hint: progress && !progress.completed
        ? ('الترميم المرحلي: ' + progress.done + '/' + progress.total + ' — حدّث الصفحة دي تاني عشان تكمّل المرحلة الجاية')
        : undefined,
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 })
  }
}

export async function POST() { return GET() }
