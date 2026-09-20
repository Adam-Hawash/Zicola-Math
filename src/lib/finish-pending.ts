// ============================================================
// FILE: src/lib/finish-pending.ts
// PURPOSE: (2026-و60) «مكمّل التصحيح» — طلب المستر الحرفي:
//   «كل الأسئلة المقالي في الواجب كله بيتصحح غلط… ولا بيقول لي إن
//    الـ AI قرأ الإجابة ولا بيجيب لي ملاحظات… ده معلق خالص»
//   ------------------------------------------------------------
//   الجذر: التصحيح الخلفي بيتوقف في نص السكة على السيرفر السحابي
//   (مهلة التنفيذ) — والأخطر إن إعادة التصحيح الكاملة (regrade)
//   بتتصحح الـ 19 سؤال كلهم في نداء واحد وبتحفظ **مرة واحدة في الآخر**،
//   فلو اتقطعت = صفر تقدم وكل حاجة تفضل معلقة للأبد.
//   الحل هنا: استكمال **الأسئلة الناقصة بس** + حفظ بعد **كل سؤال** —
//   أي قطع بيخسّر أقصى حاجة سؤال واحد من الشغل، والنداء اللي بعده يكمّل.
//   • بيشتغل من: رؤية أي نتيجة (طالب/ولي أمر/أدمن) + الـ sweep الأدمن
//   • الأسئلة المُصححة صح **مش بت تتلمس خالص** (من غير إعادة تصحيح غالية)
//   • صورة من غير أي ملاحظة AI = تصحيح فشل بصمت → بيترفع تاني
// ------------------------------------------------------------

import { db } from '@/lib/db'
import {
  ensureResultColumns,
  splitQuestions,
  mcqContrib,
  applyOverrides,
  sumMax,
  gradeWritingDecisive,
  type QItem,
} from '@/lib/regrade-core'
import { resolveQuestionsForStudent } from '@/lib/exam-models'

// هل حكم السؤال ده ناقص تصحيح فعلاً؟ (أوسع من فحص pending العادي عشان
// يشمل الحالات اللي فشل تصحيحها بصمت: graded من غير ملاحظة على صورة)
export function verdictNeedsWork(v: any): boolean {
  if (!v) return true
  if (v.gradingStatus !== 'graded') return true
  if (v.needsGrading === true) return true
  if (v.awardedPoints === undefined || v.awardedPoints === null) return true
  // صورة مرفقة ومن غير أي ملاحظة AI = المصحح الذكي ما قريهاش أصلًا
  var ans = String(v.answer || '')
  if (ans.indexOf('[📷') !== -1) {
    var fb = String(v.aiFeedback || v.feedback || '')
    if (!fb) return true
  }
  return false
}

// حارس تشغيل داخل العملية — ممنوع نفس النتيجة تتقاد في نفس اللحظة مرتين
var inFlight: Record<string, boolean> = {}

function parseVerdicts(raw: any): any[] {
  try {
    var parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (e) { return [] }
}

function parseAnswers(raw: any): any {
  try { return raw ? JSON.parse(raw) : [] } catch (e) { return [] }
}

// حساب الدرجة النهائية من الأحكام المدموجة (نفس معادلة regrade بالظبط)
function computeScore(
  parts: { mcq: QItem[]; writing: QItem[]; all: any[] },
  mergedVerdicts: any[],
  answers: any,
  overridesJson: any,
  fallbackMax: number
): { score: number; maxScore: number } {
  var mcqResult = mcqContrib(parts.mcq, answers)
  var overrideContrib = applyOverrides(mergedVerdicts, overridesJson, parts.all, 5)
  var contrib: Record<string, number> = Object.assign({}, mcqResult.contrib)
  mergedVerdicts.forEach(function (g) {
    if (g && g.origIdx !== undefined) contrib[String(g.origIdx)] = Number(g.awardedPoints) || 0
  })
  Object.keys(overrideContrib).forEach(function (k) { contrib[k] = overrideContrib[k] })
  var score = 0
  Object.keys(contrib).forEach(function (k) { score += contrib[k] || 0 })
  var maxScore = sumMax(parts.all, parts.mcq.length, mergedVerdicts)
  if (!maxScore) maxScore = fallbackMax || 1
  return { score: score, maxScore: maxScore }
}

// ============ الواجبات ============
export async function finishPendingForHomeworkResult(
  resultId: string
): Promise<{ graded: number; score: number } | null> {
  var lock = 'hw:' + resultId
  if (inFlight[lock]) return null
  inFlight[lock] = true
  try {
    await ensureResultColumns()
    var rows: any[] = await db.$queryRawUnsafe(
      'SELECT id, homeworkId, studentId, score, maxScore, answers, writingResults, gradeOverrides FROM HomeworkResult WHERE id = ? LIMIT 1',
      resultId
    )
    if (!rows || rows.length === 0) return null
    var res = rows[0]
    var hwRows: any[] = await db.$queryRawUnsafe(
      'SELECT id, questions FROM Homework WHERE id = ? LIMIT 1',
      res.homeworkId
    )
    if (!hwRows || hwRows.length === 0) return null
    var rawQ: any[] = []
    try {
      rawQ = typeof hwRows[0].questions === 'string' ? JSON.parse(hwRows[0].questions) : hwRows[0].questions
      if (!Array.isArray(rawQ)) rawQ = []
    } catch (e) { rawQ = [] }
    var parts = splitQuestions(rawQ)
    if (parts.writing.length === 0) return null

    var answers = parseAnswers(res.answers)
    var verdicts = parseVerdicts(res.writingResults)
    var byIdx: Record<string, any> = {}
    verdicts.forEach(function (v) { if (v && v.origIdx !== undefined) byIdx[String(v.origIdx)] = v })

    var pendingItems = parts.writing.filter(function (it) { return verdictNeedsWork(byIdx[String(it.origIdx)]) })
    if (pendingItems.length === 0) return { graded: 0, score: Number(res.score) || 0 }

    var gradedCount = 0
    for (var i = 0; i < pendingItems.length; i++) {
      var item = pendingItems[i]
      try {
        var one = await gradeWritingDecisive([item], answers)
        var v = one && one.verdicts && one.verdicts[0] ? one.verdicts[0] : null
        if (v) {
          if (v.origIdx === undefined) v.origIdx = item.origIdx
          byIdx[String(item.origIdx)] = v
          gradedCount++
        }
      } catch (e) {
        console.error('[finish-pending] hw grade one error:', e)
        /* الرجوع للقيمة القديمة — النداء الجاي يكمّل */
      }
      // حفظ بعد كل سؤال — القطع هنا بيخسّر سؤال واحد بالكتير
      var merged = parts.writing
        .map(function (it) { return byIdx[String(it.origIdx)] })
        .filter(Boolean)
      var sc = computeScore(parts, merged, answers, res.gradeOverrides, res.maxScore)
      try {
        await db.$executeRawUnsafe(
          'UPDATE HomeworkResult SET score = ?, maxScore = ?, writingResults = ? WHERE id = ?',
          sc.score, sc.maxScore, JSON.stringify(merged), resultId
        )
      } catch (pErr) { console.error('[finish-pending] hw persist error:', pErr) }
    }
    var finalRows: any[] = await db.$queryRawUnsafe(
      'SELECT score FROM HomeworkResult WHERE id = ? LIMIT 1', resultId
    )
    return { graded: gradedCount, score: finalRows && finalRows.length ? Number(finalRows[0].score) || 0 : 0 }
  } catch (e) {
    console.error('[finish-pending] hw error:', e)
    return null
  } finally {
    delete inFlight[lock]
  }
}

// ============ الامتحانات (بنفس أسئلة نموذج الطالب — و22) ============
export async function finishPendingForExamResult(
  resultId: string
): Promise<{ graded: number; score: number } | null> {
  var lock = 'ex:' + resultId
  if (inFlight[lock]) return null
  inFlight[lock] = true
  try {
    await ensureResultColumns()
    var rows: any[] = await db.$queryRawUnsafe(
      'SELECT id, examId, studentId, score, maxScore, answers, writingGrades, writingResults, gradeOverrides FROM ExamResult WHERE id = ? LIMIT 1',
      resultId
    )
    if (!rows || rows.length === 0) return null
    var res = rows[0]
    var examRows: any[] = await db.$queryRawUnsafe(
      'SELECT id, questions, models, modelMode, fixedModel FROM Exam WHERE id = ? LIMIT 1',
      res.examId
    )
    if (!examRows || examRows.length === 0) return null
    var rawQ: any[] = resolveQuestionsForStudent(examRows[0], res.studentId, res.examId)
    var parts = splitQuestions(rawQ)
    if (parts.writing.length === 0) return null

    var answers = parseAnswers(res.answers)
    // الامتحان بيكتب العمودين — نقرأ من writingGrades (مرجع العرض) وwritingResults (مرآة)
    var verdicts = parseVerdicts(res.writingGrades)
    if (verdicts.length === 0) verdicts = parseVerdicts(res.writingResults)
    var byIdx: Record<string, any> = {}
    verdicts.forEach(function (v) { if (v && v.origIdx !== undefined) byIdx[String(v.origIdx)] = v })

    var pendingItems = parts.writing.filter(function (it) { return verdictNeedsWork(byIdx[String(it.origIdx)]) })
    if (pendingItems.length === 0) return { graded: 0, score: Number(res.score) || 0 }

    var gradedCount = 0
    for (var i = 0; i < pendingItems.length; i++) {
      var item = pendingItems[i]
      try {
        var one = await gradeWritingDecisive([item], answers)
        var v = one && one.verdicts && one.verdicts[0] ? one.verdicts[0] : null
        if (v) {
          if (v.origIdx === undefined) v.origIdx = item.origIdx
          byIdx[String(item.origIdx)] = v
          gradedCount++
        }
      } catch (e) {
        console.error('[finish-pending] exam grade one error:', e)
      }
      var merged = parts.writing
        .map(function (it) { return byIdx[String(it.origIdx)] })
        .filter(Boolean)
      var sc = computeScore(parts, merged, answers, res.gradeOverrides, res.maxScore)
      try {
        await db.$executeRawUnsafe(
          'UPDATE ExamResult SET score = ?, maxScore = ?, writingGrades = ?, writingResults = ? WHERE id = ?',
          sc.score, sc.maxScore, JSON.stringify(merged), JSON.stringify(merged), resultId
        )
      } catch (pErr) { console.error('[finish-pending] exam persist error:', pErr) }
    }
    var finalRows: any[] = await db.$queryRawUnsafe(
      'SELECT score FROM ExamResult WHERE id = ? LIMIT 1', resultId
    )
    return { graded: gradedCount, score: finalRows && finalRows.length ? Number(finalRows[0].score) || 0 : 0 }
  } catch (e) {
    console.error('[finish-pending] exam error:', e)
    return null
  } finally {
    delete inFlight[lock]
  }
}

// فاحص خفيف: هل نتيجة واجب فيها أسئلة ناقصة تصحيح؟ (من غير أي نداء AI)
export async function homeworkResultHasPending(resultId: string): Promise<boolean> {
  try {
    var rows: any[] = await db.$queryRawUnsafe(
      'SELECT writingResults FROM HomeworkResult WHERE id = ? LIMIT 1', resultId
    )
    if (!rows || rows.length === 0) return false
    var verdicts = parseVerdicts(rows[0].writingResults)
    if (verdicts.length === 0) return false
    for (var i = 0; i < verdicts.length; i++) {
      if (verdictNeedsWork(verdicts[i])) return true
    }
    return false
  } catch (e) { return false }
}

// فاحص خفيف لنتايج امتحان — بيرجّع أول resultId ناقص تصحيح أو null
export async function firstPendingExamResultId(resultIds: string[]): Promise<string | null> {
  if (!resultIds || resultIds.length === 0) return null
  try {
    var placeholders = resultIds.map(function () { return '?' }).join(',')
    var rows: any[] = await db.$queryRawUnsafe(
      'SELECT id, writingGrades FROM ExamResult WHERE id IN (' + placeholders + ')',
      resultIds
    )
    for (var i = 0; i < (rows || []).length; i++) {
      var verdicts = parseVerdicts(rows[i].writingGrades)
      for (var j = 0; j < verdicts.length; j++) {
        if (verdictNeedsWork(verdicts[j])) return String(rows[i].id)
      }
    }
  } catch (e) {}
  return null
}

// فاحص خفيف لنتايج واجب — بيرجّع أول resultId ناقص تصحيح أو null
export async function firstPendingHomeworkResultId(resultIds: string[]): Promise<string | null> {
  if (!resultIds || resultIds.length === 0) return null
  try {
    var placeholders = resultIds.map(function () { return '?' }).join(',')
    var rows: any[] = await db.$queryRawUnsafe(
      'SELECT id, writingResults FROM HomeworkResult WHERE id IN (' + placeholders + ')',
      resultIds
    )
    for (var i = 0; i < (rows || []).length; i++) {
      var verdicts = parseVerdicts(rows[i].writingResults)
      for (var j = 0; j < verdicts.length; j++) {
        if (verdictNeedsWork(verdicts[j])) return String(rows[i].id)
      }
    }
  } catch (e) {}
  return null
}


