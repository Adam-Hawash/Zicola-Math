// ============================================================
// grade-names — توحيد الصف «أولى ثانوي» (كان اسمه «أولى بكالوريا»)
// ============================================================
// طلب المستر الحرفي: «أي حاجة في المنصة فيها أولى بكالوريا تتحول لأولى
// ثانوي — تبقى أولى بكالوريا هي هي أولى ثانوي» — يعني نفس الصف باسمين:
//  • أي كتابة جديدة بتتخزن باسم «أولى ثانوي»
//  • أي قراءة بتجيب الاسمين مع بعض (القديم المخزن بكالوريا + الجديد ثانوي)
//  • أي عرض بيرجع «أولى ثانوي» بس
// النسخة دي المرجع الموحد بدل النسخ المحلية المتفرقة في كل API.
// ============================================================

export const GRADE_S1 = 'أولى ثانوي'           // الاسم الرسمي الجديد
export const GRADE_S1_LEGACY = 'أولى بكالوريا' // الاسم القديم المخزن — نفس الصف بالظبط

/* تطبيع اسم الصف (نفس منطق النسخ المحلية القديمة + دعم ثانوي) */
export function normalizeGrade(grade: string): string {
  if (!grade) return ''
  var g = String(grade).trim()
  g = g.replace(/^الصف\s+/i, '')
  g = g.replace(/الاعدادي/gi, 'إعدادي')
  g = g.replace(/الإعدادي/gi, 'إعدادي')
  g = g.replace(/البكالوريا/gi, 'بكالوريا')
  g = g.replace(/بكالوريا/gi, 'بكالوريا')
  if (g.includes('أولى') || g.includes('اولى') || g.includes('الأول')) g = 'أولى'
  if (g.includes('تانية') || g.includes('الثاني')) g = 'تانية'
  if (g.includes('تالتة') || g.includes('الثالث')) g = 'تالتة'
  if (g.includes('الرابع')) g = 'الرابع'
  if (g.includes('الخامس')) g = 'الخامس'
  if (g.includes('السادس')) g = 'السادس'
  // اللاحقات: إعدادي الأول — بعدها الثانوي (بكالوريا = ثانوي حاجة واحدة)
  if (g === 'أولى' && grade.includes('عداد')) g = 'أولى إعدادي'
  if (g === 'تانية' && grade.includes('عداد')) g = 'تانية إعدادي'
  if (g === 'تالتة' && grade.includes('عداد')) g = 'تالتة إعدادي'
  if (g === 'أولى' && (grade.includes('كالور') || grade.includes('ثانوي'))) g = GRADE_S1
  // «أولى» لوحدها (تخزين قديم من قبل الإصلاح) = أولى ثانوي برضه
  if (g === 'أولى') g = GRADE_S1
  return g
}

/* فلتر Prisma للقراءة: أولى ثانوي بتجيب الاسمين مع بعض */
export function gradeWhere(grade: string): string | { in: string[] } {
  var g = normalizeGrade(grade)
  if (g === GRADE_S1) return { in: [GRADE_S1, GRADE_S1_LEGACY] }
  return g
}

/* (2026-ص3) كل الصيغ المخزنة اللي تعني نفس الصف — مطابقة **تساوي حرفية**
   مكان خدعة contains بكلمة واحدة اللي كانت بتسرّب الحاجات بين الصفوف:
   «أولى ثانوي» كانت بتجيب «أولى إعدادي» و«أولى ابتدائي» كمان لأن أول
   كلمة فيهم «أولى»! — يعني امتحان أولى ثانوي كان بيظهر لأولى إعدادي.
   القاعدة دلوقتي: نفس الصف بالاسم الرسمي + الاسم القديم (بكالوريا) +
   «أولى» لوحدها (تخزين قديم قبل التوحيد — مرجع normalizeGrade) + التوأم
   الإملائي (ثانوى/اعدادى بالى) للصفوف اللي اتحفظت قبل التوحيد — **وبس**.
   عمرها ما تطابق صف تاني مهما كان قريب. */
export function gradeVariants(grade: string): string[] {
  var g = String(grade || '').trim()
  var n = normalizeGrade(g)
  var out: string[] = []
  if (g) out.push(g) // الصيغة الخام زي ما بعتها الطلب
  if (n) out.push(n) // الصيغة المطبعة الرسمية
  if (n === GRADE_S1) {
    out.push(GRADE_S1_LEGACY) // «أولى بكالوريا» — نفس الصف بالاسم القديم
    out.push('أولى')          // «أولى» لوحدها — تخزين قديم = أولى ثانوي
  }
  /* توأم إملائي محدود للكلمات اللي بتتباين في الى/ي بس — ممنوع استبدال
     عمي (كان بيخرّب «بكالوريا» لـ«بكالورياى») */
  var twin = function (v: string): string {
    return String(v || '').replace('ثانوي', 'ثانوى').replace('إعدادي', 'إعدادى')
  }
  var arr = out.slice()
  for (var i = 0; i < arr.length; i++) { var t = twin(arr[i]); if (t !== arr[i]) out.push(t) }
  var seen: Record<string, boolean> = {}
  var res: string[] = []
  for (var j = 0; j < out.length; j++) { var v = out[j]; if (v && !seen[v]) { seen[v] = true; res.push(v) } }
  return res
}

/* أي اسم قديم في بيانات مخزنة بيرجع معروض بالاسم الجديد */
export function displayGrade(grade?: string | null): string {
  var g = String(grade || '').trim()
  if (!g) return ''
  if (g.indexOf('كالوريا') !== -1) return GRADE_S1
  return g
}

/* قيمة بتتخزن (كتابة جديدة دايمًا بالاسم الجديد) */
export function storeGrade(grade?: string | null): string {
  var g = normalizeGrade(String(grade || ''))
  return g || String(grade || '')
}
