// ============================================================
// grade-names — المرجع الموحد لأسماء الصفوف في كل المنصة
// ============================================================
// (توحيد الصفوف — طلب المستر: «ما تخلي البيانات كلها زي بعض عشان
//  الامتحانات تظهر»)
//
// العلة اللي كانت: كل صيغ صفوف الابتدائي بتتخزن بشكل مختلف —
//   «الخامسة الابتدائي» بتتخزن «الخامس» (بتقطيع includes)،
//   «خمسة ابتدائي» بتفضل زي ما هي، و«خامس» القديمة بتفضل —
//   فالامتحان المضاف لصف ما كانش بيظهر لطلاب نفس الصف، والقايمة
//   المنسدلة كانت فيها «الخامس، السادس، الرابع» جنب الأسماء الكاملة.
//
// القاعدة دلوقتي — **اسم معتمد واحد لكل صف**:
//   • أي كتابة (storeGrade) بتتخزن بالاسم المعتمد الكامل
//   • أي قراءة (gradeVariants/gradeWhere) بتجيب كل الصيغ القديمة مع بعض
//   • أي عرض (displayGrade) بيرجع الاسم المعتمد الكامل
// الأسماء المعتمدة = نفس أسماء DEFAULT_GRADES في app-store و
// PRIMARY_GRADE_FAMILIES هنا اللي ensure-schema بيوحّد عليها قاعدة البيانات.
// ============================================================

export const GRADE_S1 = 'أولى ثانوي'           // الاسم الرسمي الجديد
export const GRADE_S1_LEGACY = 'أولى بكالوريا' // الاسم القديم المخزن — نفس الصف بالظبط

/* ------------------------------------------------------------
   عائلات صفوف الابتدائي — كل صيغة ممكن تتخزن → الاسم المعتمد.
   bareSafe = الصيغ المفردة (من غير كلمة «ابتدائي») آمنة للعيلة دي —
   رابعة/خامسة/سادس مفيش صف تاني بيبدأ بنفس الكلمات، لكن الأول/الثاني/
   التالتة بيتلخبطوا مع الإعدادي/الثانوي («أولى» لوحدها = أولى ثانوي)
   فلازم كلمة «ابتدائي» تكون موجودة في الاسم الأصلي بتاعهم.
   ------------------------------------------------------------ */
export interface PrimaryGradeFamily {
  ar: string
  en: string
  emoji: string
  short: string
  bareSafe: boolean
  keys: string[]
}

export const PRIMARY_GRADE_FAMILIES: PrimaryGradeFamily[] = [
  {
    ar: 'الرابعة الابتدائي', en: 'Grade 4', emoji: '4️⃣', short: 'G4', bareSafe: true,
    keys: ['رابعة', 'رابع', 'ربعة', 'ربع', 'رابعة ابتدائي', 'رابع ابتدائي', 'ربعة ابتدائي', 'grade 4', 'g4', '4', '٤'],
  },
  {
    ar: 'الخامسة الابتدائي', en: 'Grade 5', emoji: '5️⃣', short: 'G5', bareSafe: true,
    /* «خمسة» و«خمس» بدون ألف كمان — صيغ مصرية شائعة */
    keys: ['خامسة', 'خامس', 'خمسة', 'خمس', 'خامسة ابتدائي', 'خامس ابتدائي', 'خمسة ابتدائي', 'خمس ابتدائي', 'grade 5', 'g5', '5', '٥'],
  },
  {
    ar: 'السادس الابتدائي', en: 'Grade 6', emoji: '6️⃣', short: 'G6', bareSafe: true,
    keys: ['سادس', 'سادسة', 'سادس ابتدائي', 'سادسة ابتدائي', 'grade 6', 'g6', '6', '٦'],
  },
  {
    ar: 'الأول الابتدائي', en: 'Grade 1', emoji: '1️⃣', short: 'G1', bareSafe: false,
    keys: ['الاول الابتدائي', 'اولي ابتدائي', 'الاولي الابتدائي', 'اول ابتدائي', 'grade 1 primary', 'g1 primary'],
  },
  {
    ar: 'الثاني الابتدائي', en: 'Grade 2', emoji: '2️⃣', short: 'G2', bareSafe: false,
    keys: ['الثاني الابتدائي', 'ثاني ابتدائي', 'الثانية الابتدائي', 'ثانية ابتدائي', 'grade 2 primary', 'g2 primary'],
  },
  {
    ar: 'التالتة الابتدائي', en: 'Grade 3', emoji: '3️⃣', short: 'G3', bareSafe: false,
    keys: ['التالتة الابتدائي', 'تالتة ابتدائي', 'الثالثة الابتدائي', 'ثالثة ابتدائي', 'تالت ابتدائي', 'grade 3 primary', 'g3 primary'],
  },
]

/* تطبيع مفتاح المقارنة: شيل «الصف» + وحّد الهمزات والتاء المربوطة/الألف
   المقصورة والتطويل والتشكيل + اطوي المسافات + lowercase (للاتيني) */
function gradeKey(name: any): string {
  var g = String(name || '')
  g = g.replace(/^\s*الصف\s+/u, '')
  g = g.replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627') // أ إ آ ٱ → ا
  g = g.replace(/\u0649/g, '\u064A')                     // ى → ي
  g = g.replace(/\u0640/g, '')                           // ـ tatweel
  g = g.replace(/[\u064B-\u0652]/g, '')                  // التشكيل
  g = g.replace(/\s+/g, ' ').trim().toLowerCase()
  return g
}

/* الاسم بدون بادئة «ال» ولاحقة «الابتدائي» — للمطابقة الضبابية جوه العيلة */
function stripBare(key: string): string {
  return key.replace(/^(ال)?/, '').replace(/\s*(ابتدائي|الابتدائي)$/, '').trim()
}

/* ------------------------------------------------------------
   الاسم بيمثل صف ابتدائي من العائلات؟ → بيانات الاسم المعتمد (أو null)
   دي نفس منطق canonicalPrimaryGrade في ensure-schema بس من المرجع الموحد.
   ------------------------------------------------------------ */
export function primaryGradeCanonical(name: any): PrimaryGradeFamily | null {
  var key = gradeKey(name)
  if (!key) return null
  var bare = stripBare(key)
  var hasIbtidai = key.indexOf('ابتدائي') !== -1
  for (var i = 0; i < PRIMARY_GRADE_FAMILIES.length; i++) {
    var f = PRIMARY_GRADE_FAMILIES[i]
    for (var k = 0; k < f.keys.length; k++) {
      if (key === gradeKey(f.keys[k])) return f
    }
    if (f.bareSafe || hasIbtidai) {
      for (var k2 = 0; k2 < f.keys.length; k2++) {
        var kk2 = stripBare(gradeKey(f.keys[k2]))
        if (bare && bare === kk2) return f
      }
    }
  }
  return null
}

/* ------------------------------------------------------------
   تطبيع اسم الصف — الاسم المعتمد:
   • كل صيغ صفوف الابتدائي (الخامس/خمسة/خامسة/5/grade 5/الصف الخامسة
     الابتدائي/...) → «الخامسة الابتدائي» بالاسم الكامل
   • صفوف الإعدادي والثانوي — نفس المنطق المثبت القديم
   ------------------------------------------------------------ */
export function normalizeGrade(grade: string): string {
  if (!grade) return ''
  var raw = String(grade).trim()
  if (!raw) return ''
  /* (توحيد الصفوف) عائلات الابتدائي الأول — كل الصيغ → الاسم المعتمد الكامل */
  var primary = primaryGradeCanonical(raw)
  if (primary) return primary.ar
  var g = raw.replace(/^الصف\s+/i, '')
  g = g.replace(/الاعدادي/gi, 'إعدادي')
  g = g.replace(/الإعدادي/gi, 'إعدادي')
  g = g.replace(/البكالوريا/gi, 'بكالوريا')
  g = g.replace(/بكالوريا/gi, 'بكالوريا')
  if (g.includes('أولى') || g.includes('اولى') || g.includes('الأول')) g = 'أولى'
  if (g.includes('تانية') || g.includes('الثاني')) g = 'تانية'
  if (g.includes('تالتة') || g.includes('الثالث')) g = 'تالتة'
  // اللاحقات: إعدادي الأول — بعده الثانوي (بكالوريا = ثانوي حاجة واحدة)
  if (g === 'أولى' && raw.includes('عداد')) g = 'أولى إعدادي'
  if (g === 'تانية' && raw.includes('عداد')) g = 'تانية إعدادي'
  if (g === 'تالتة' && raw.includes('عداد')) g = 'تالتة إعدادي'
  if (g === 'أولى' && (raw.includes('كالور') || raw.includes('ثانوي'))) g = GRADE_S1
  // «أولى» لوحدها (تخزين قديم من قبل الإصلاح) = أولى ثانوي برضه
  if (g === 'أولى') g = GRADE_S1
  return g
}

/* فلتر Prisma للقراءة: بيجيب كل صيغ نفس الصف مع بعض */
export function gradeWhere(grade: string): string | { in: string[] } {
  var vs = gradeVariants(grade)
  if (vs.length === 0) return normalizeGrade(grade)
  if (vs.length === 1) return vs[0]
  return { in: vs }
}

/* ------------------------------------------------------------
   (2026-ص3 + توحيد الصفوف) كل الصيغ المخزنة اللي تعني نفس الصف —
   مطابقة **تساوي حرفية** على القايمة دي مكان خدعة contains بكلمة واحدة.
   للصف الابتدائي: الاسم المعتمد + كل مفاتيح العيلة + الصيغ القصيرة
   القديمة (الخامس/خامس/خمسة ابتدائي/...) — عشان أي اسم اتخزن قبل
   التوحيد يظل يطابق، وعمرها ما تطابق صف تاني مهما كان قريب.
   ------------------------------------------------------------ */
export function gradeVariants(grade: string): string[] {
  var g = String(grade || '').trim()
  var n = normalizeGrade(g)
  var out: string[] = []
  if (g) out.push(g) // الصيغة الخام زي ما بعتها الطلب
  if (n) out.push(n) // الصيغة المطبعة الرسمية
  var fam = primaryGradeCanonical(g) || primaryGradeCanonical(n)
  if (fam) {
    out.push(fam.ar) // الاسم المعتمد الكامل
    for (var k = 0; k < fam.keys.length; k++) {
      var kk = String(fam.keys[k] || '').trim()
      if (kk) out.push(kk)
      var kb = stripBare(gradeKey(kk))
      if (kb) {
        out.push(kb)        // «خامس» / «خمسة» ...
        out.push('ال' + kb) // «الخامس» / «الخمسة» — صيغ التقطيع القديمة
      }
    }
    out.push('الصف ' + fam.ar)
  }
  if (n === GRADE_S1) {
    out.push(GRADE_S1_LEGACY) // «أولى بكالوريا» — نفس الصف بالاسم القديم
    out.push('أولى')          // «أولى» لوحدها — تخزين قديم = أولى ثانوي
  }
  /* توأم إملائي محدود للكلمات اللي بتتباين في الى/ي بس — ممنوع استبدال
     عمي (كان بيخرّب «بكالوريا») */
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

/* ------------------------------------------------------------
   أي اسم قديم في بيانات مخزنة بيرجع معروض بالاسم المعتمد الكامل —
   «الخامس» بتظهر «الخامسة الابتدائي» في شارة الطالب وقوائم الأدمن.
   ------------------------------------------------------------ */
export function displayGrade(grade?: string | null): string {
  var g = String(grade || '').trim()
  if (!g) return ''
  if (g.indexOf('كالوريا') !== -1) return GRADE_S1
  var fam = primaryGradeCanonical(g)
  if (fam) return fam.ar
  return g
}

/* قيمة بتتخزن (كتابة جديدة دايمًا بالاسم المعتمد الكامل) */
export function storeGrade(grade?: string | null): string {
  var g = normalizeGrade(String(grade || ''))
  return g || String(grade || '')
}
