/* ============================================================
// table-sanitize — (2026-و55) إخفاء إجابات الـ AI في الجداول عن الطالب
// ============================================================
// مشكلة المستر: «الـ AI بيجاوب جوه الجدول والنتايج بتظهر للطالب —
// عايز الجدول يبقى فاضي الطالب هو اللي يكتب فيه والإجابة تتصحح
// بناء على الإجابة الصحيحة».
//
// الحل الأوتوماتيكي (من غير إعادة استخراج):
//   لما السيرفر يرصّ أسئلة لطالب (مش أدمن)، أي جدول الـ AI حطّ فيه
//   قيم جاهزة من غير ولا خانة blank:true (ده توقيع «الـ AI حل الجدول
//   كله») بتتحول كل خلاياه لخانات فاضية يكتبها الطالب — والعناوين
//   بتفضل زي ما هي، والقيم الأصلية بتفضل محفوظة في الداتابيز
//   (موجودة للإدمن في المحرر + التصحيح بيتم من modelAnswer على السيرفر).
//
// الجداول اللي فيها blank:true (بنية سليمة: خلايا معطاة + خانات للطالب)
//   بتتفض زي ما هي — وكمان لو المستر عدّل الجدول بنفسه من المحرر وحطّ
//   خانات فاضية، بنيته بتنتصر لأن القاعدة بتلمس الجداول اللي مفيهاش
//   ولا خانة فاضية بس.
//
// ⚠️ الأمان: التنظيف بيحصل على السيرفر قبل ما الـ JSON يوصل للطالب —
//   القيم الصحيحة مبتتنقلش للعميل خالص (مفيش تسريب في Network/DOM). */

interface SanCell { t?: string; blank?: boolean }
interface SanTable { headers?: unknown; rows?: unknown }

/** هل الخلية دي فاضية رسميًا (خانة للطالب)؟ */
function isBlankCell(cell: unknown): boolean {
  return !!(
    cell &&
    typeof cell === 'object' &&
    (cell as SanCell).blank === true
  )
}

/** هل الجدول ده «الـ AI حله كله»؟ = مفيهوش ولا خانة blank واحدة */
export function tableIsFullyAnswered(table: unknown): boolean {
  var t = table as SanTable | null
  if (!t || !Array.isArray(t.rows)) return false
  var anyCell = false
  for (var r = 0; r < t.rows.length; r++) {
    var row = t.rows[r]
    if (!Array.isArray(row)) continue
    for (var c = 0; c < row.length; c++) {
      var cell = row[c]
      /* خلية فاضية تمامًا ('' أو null) بتتحسب فاضية كمان */
      var txt = cell && typeof cell === 'object' ? String((cell as SanCell).t || '') : String(cell || '')
      if (isBlankCell(cell) || txt.trim() === '') return false
      anyCell = true
    }
  }
  return anyCell
}

/** تحويل جدول «مجاوب كله» لجدول فاضي يكتبه الطالب (العناوين بتتفض) */
export function blankOutTable(table: unknown): SanTable {
  var t = table as SanTable
  var rows = Array.isArray(t.rows) ? t.rows : []
  return {
    headers: t.headers,
    rows: rows.map(function (row: unknown) {
      var arr = Array.isArray(row) ? row : []
      return arr.map(function () {
        return { t: '', blank: true }
      })
    }),
  }
}

/** تنظيف جدول واحد بقاعدة الإخفاء — بيرجع الجدول زي ما هو لو مش محتاج تنظيف */
export function sanitizeTableForStudent(table: unknown): unknown {
  if (tableIsFullyAnswered(table)) return blankOutTable(table)
  return table
}

/** تنظيف قائمة أسئلة (object/array) — بينظف table لكل سؤال */
export function sanitizeQuestionsForStudent(questions: unknown): unknown {
  if (!Array.isArray(questions)) return questions
  return questions.map(function (q: unknown) {
    if (!q || typeof q !== 'object') return q
    var qq = q as Record<string, unknown>
    if (!qq.table) return q
    return Object.assign({}, qq, { table: sanitizeTableForStudent(qq.table) })
  })
}

/**
 * نقطة الدخول لمسارات الـ API: بياخد نص questions الخام من الداتابيز
 * ويرجّع نص منظّف جاهز للطالب. أي فشل parse = النص الأصلي زي ما هو
 * (fail-open — ممنوع نكسر رد الـ API عشان جدول).
 */
export function questionsJsonForStudent(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw
  var str = typeof raw === 'string' ? raw : String(raw)
  if (!str.trim()) return raw
  try {
    var parsed = JSON.parse(str)
    return JSON.stringify(sanitizeQuestionsForStudent(parsed))
  } catch (e) {
    return raw
  }
}
