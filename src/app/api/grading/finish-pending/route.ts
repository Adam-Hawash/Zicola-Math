// ============================================================
// FILE: src/app/api/grading/finish-pending/route.ts
// (2026-و60) «مكمّل التصحيح» — طلب المستر: الأسئلة المقالي اللي فضلت
// معلقة من غير ملاحظات ولا درجة تتقاد فورًا مش بعد ساعات.
//   POST { kind: 'homework' | 'exam', resultId }
//   بيكمل **الأسئلة الناقصة بس** بتصحيح ذكي حقيقي (AI) + حفظ بعد كل
//   سؤال — وبيشتغل من رؤية أي نتيجة (طالب/ولي أمر/أدمن) مش بس من
//   فتح لوحة الأدمن زي ما كان.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { finishPendingForHomeworkResult, finishPendingForExamResult } from '@/lib/finish-pending'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    var body: any = null
    try { body = await req.json() } catch (e) {}
    var kind = String((body && body.kind) || 'homework')
    var resultId = String((body && body.resultId) || '').trim()
    if (!resultId) return NextResponse.json({ error: 'resultId مطلوب' }, { status: 400 })

    var out = kind === 'exam'
      ? await finishPendingForExamResult(resultId)
      : await finishPendingForHomeworkResult(resultId)

    if (!out) return NextResponse.json({ ok: false, skipped: true })
    return NextResponse.json({ ok: true, graded: out.graded, score: out.score })
  } catch (error) {
    console.error('finish-pending error:', error)
    return NextResponse.json({ error: 'حصل خطأ في استكمال التصحيح' }, { status: 500 })
  }
}
