// @ts-nocheck
// Shared database self-repair: full schema DDL (tables + columns + fixes).
// Used by /api/setup-db (manual) and /api/health (auto-heal when tables are
// missing) so a freshly-swapped database repairs itself instead of 500ing
// every API (the "الفديو مش شغال" outage class).
import { createClient } from '@libsql/client'
/* (توحيد الصفوف) المرجع الموحد لأسماء الصفوف — نفس العائلات المستخدمة
   في كل الـ APIs بدل نسخة محلية بتتفرق عن الأصل
   (S-3) normalizeGrade اتضاف للترحيل الفعلي لصفوف الجداول */
import { primaryGradeCanonical, normalizeGrade } from './grade-names'

export function makeLibsqlClient() {
  var dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''
  var authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || ''
  if (!dbUrl) return null
  return createClient({ url: dbUrl, authToken: authToken || undefined })
}

export var SCHEMA_TABLES = [
  'CREATE TABLE IF NOT EXISTS StudentGroup (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS VideoGroupSchedule (id TEXT PRIMARY KEY, videoId TEXT NOT NULL, groupId TEXT NOT NULL, unlockAt DATETIME, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS Admin (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL DEFAULT "Admin", createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS Student (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, password TEXT NOT NULL DEFAULT "", grade TEXT NOT NULL, status TEXT NOT NULL DEFAULT "pending", parentName TEXT NOT NULL DEFAULT "", parentPhone TEXT NOT NULL DEFAULT "", loginCount INTEGER NOT NULL DEFAULT 0, lastLogin DATETIME, isPaidAccess INTEGER NOT NULL DEFAULT 0, deviceId TEXT NOT NULL DEFAULT "", deviceFp TEXT NOT NULL DEFAULT "", deviceTraits TEXT NOT NULL DEFAULT "", creationDeviceId TEXT NOT NULL DEFAULT "", creationDeviceFp TEXT NOT NULL DEFAULT "", deviceType TEXT NOT NULL DEFAULT "", allowAllDevices INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS StudentActivity (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, action TEXT NOT NULL, details TEXT DEFAULT "", createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (studentId) REFERENCES Student(id) ON DELETE CASCADE)',
  'CREATE TABLE IF NOT EXISTS Video (id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT DEFAULT "", filePath TEXT DEFAULT "", fileType TEXT DEFAULT "", thumbnail TEXT DEFAULT "", grade TEXT NOT NULL, price REAL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS Homework (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT "", filePath TEXT DEFAULT "", fileType TEXT DEFAULT "", thumbnail TEXT DEFAULT "", answerKeyPath TEXT DEFAULT "", answerKeyType TEXT DEFAULT "", grade TEXT NOT NULL, questions TEXT DEFAULT "", createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS Exam (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT "", filePath TEXT DEFAULT "", fileType TEXT DEFAULT "", thumbnail TEXT DEFAULT "", answerKeyPath TEXT DEFAULT "", answerKeyType TEXT DEFAULT "", grade TEXT NOT NULL, questions TEXT DEFAULT "", passScore REAL DEFAULT 50, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS ExamResult (id TEXT PRIMARY KEY, examId TEXT NOT NULL, studentId TEXT NOT NULL, score REAL DEFAULT 0, maxScore REAL DEFAULT 100, submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, answers TEXT DEFAULT \'\', writingGrades TEXT DEFAULT \'\', FOREIGN KEY (studentId) REFERENCES Student(id) ON DELETE CASCADE, FOREIGN KEY (examId) REFERENCES Exam(id) ON DELETE CASCADE)',
  'CREATE TABLE IF NOT EXISTS Announcement (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT "", grade TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS Discussion (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, studentName TEXT NOT NULL, grade TEXT NOT NULL, content TEXT NOT NULL, isAdminReply INTEGER NOT NULL DEFAULT 0, likes INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS SiteConfig (id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT DEFAULT "", updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS Media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, filePath TEXT NOT NULL, fileType TEXT NOT NULL, fileSize TEXT DEFAULT "", data TEXT DEFAULT "", category TEXT DEFAULT "general", createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS VideoProgress (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, videoId TEXT NOT NULL, watchedSeconds REAL DEFAULT 0, totalSeconds REAL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0, lastWatchedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(studentId, videoId))',
  'CREATE TABLE IF NOT EXISTS GalleryImage (id TEXT PRIMARY KEY, title TEXT DEFAULT "", filePath TEXT DEFAULT "", type TEXT DEFAULT "image", videoUrl TEXT DEFAULT "", thumbnail TEXT DEFAULT "", sortOrder INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS Payment (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, studentName TEXT DEFAULT "", studentPhone TEXT DEFAULT "", studentGrade TEXT DEFAULT "", method TEXT DEFAULT "", amount REAL DEFAULT 0, videoId TEXT DEFAULT "", videoTitle TEXT DEFAULT "", receiptPath TEXT DEFAULT "", receiptType TEXT DEFAULT "", status TEXT NOT NULL DEFAULT "pending", note TEXT DEFAULT "", reviewedAt DATETIME, reviewedBy TEXT DEFAULT "", createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (studentId) REFERENCES Student(id) ON DELETE CASCADE)',
  'CREATE TABLE IF NOT EXISTS VideoAccess (id TEXT PRIMARY KEY, videoId TEXT NOT NULL, studentId TEXT NOT NULL, grantedBy TEXT NOT NULL DEFAULT "admin", createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(videoId, studentId))',
  'CREATE TABLE IF NOT EXISTS PlayTicket (id TEXT PRIMARY KEY, videoId TEXT NOT NULL, studentId TEXT DEFAULT "", createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, expiresAt DATETIME NOT NULL, consumed INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS Complaint (id TEXT PRIMARY KEY, studentId TEXT DEFAULT "", studentName TEXT DEFAULT "", phone TEXT DEFAULT "", grade TEXT DEFAULT "", message TEXT NOT NULL, summary TEXT DEFAULT "", source TEXT NOT NULL DEFAULT "student", status TEXT NOT NULL DEFAULT "new", reply TEXT DEFAULT "", reviewedAt DATETIME, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  // (2026-و37) حساب ولي الأمر — مربوط بحساب ابنه بـ studentId (زي ما هو في Student.parentPhone)
  'CREATE TABLE IF NOT EXISTS Parent (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT "", phone TEXT NOT NULL UNIQUE, password TEXT NOT NULL DEFAULT "", studentId TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  /* (2026-و79) ولي الأمر بعدة أبناء — كل الأبناء المدموجين في حساب واحد */
  'CREATE TABLE IF NOT EXISTS ParentStudent (id TEXT PRIMARY KEY, parentId TEXT NOT NULL, studentId TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(parentId, studentId))',
  // (2026-و40) الكتب والملازم — مكتبة PDF للطالب (تاب أدمن + تاب طالب)
  // (و43) sourceUrl: لينك خارجي للكتب الكبيرة — من غير تخزين الملف في قاعدة البيانات
  'CREATE TABLE IF NOT EXISTS Book (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT \'\', filePath TEXT NOT NULL DEFAULT \'\', fileName TEXT NOT NULL DEFAULT \'\', sourceUrl TEXT NOT NULL DEFAULT \'\', fileType TEXT NOT NULL DEFAULT \'application/pdf\', sizeBytes INTEGER NOT NULL DEFAULT 0, grade TEXT NOT NULL DEFAULT \'\', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL)',
  // (2026-و44) الإشعارات — رد الشكوى/الكتب الجديدة/امتحانات وواجبات جديدة
  'CREATE TABLE IF NOT EXISTS Notification (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, type TEXT NOT NULL DEFAULT \'general\', title TEXT NOT NULL, body TEXT NOT NULL DEFAULT \'\', read INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  // (و70) قسم التحديات — فيديو المستر + حلول الطلاب بترتيب الزمن (طلب المستر حرفيًا)
  'CREATE TABLE IF NOT EXISTS Challenge (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT \'\', videoUrl TEXT DEFAULT \'\', videoType TEXT DEFAULT \'youtube\', active INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS ChallengeSolution (id TEXT PRIMARY KEY, challengeId TEXT NOT NULL, studentName TEXT NOT NULL, phone TEXT DEFAULT \'\', content TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (challengeId) REFERENCES Challenge(id) ON DELETE CASCADE)',
  /* (2026-و89) اشتراكات Web Push لولي الأمر — الإشعار الخارجي بقى إشعار براوزر حقيقي
     (مش واتساب — طلب المستر) — كل صف = جهاز مشترك لرقم ولي أمر مطبّع */
  'CREATE TABLE IF NOT EXISTS ParentPushSubscription (id TEXT PRIMARY KEY, parentId TEXT NOT NULL DEFAULT \'\', endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL DEFAULT \'\', auth TEXT NOT NULL DEFAULT \'\', userAgent TEXT NOT NULL DEFAULT \'\', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE INDEX IF NOT EXISTS idx_pps_parent ON ParentPushSubscription(parentId)',
]

var SCHEMA_COLUMNS = [
  /* (2026-و38) ميعاد المجموعة — طلب المستر: كل مجموعة لازم ليها وقت */
  ['StudentGroup', 'meetingTime', 'TEXT', "DEFAULT ''"],
  ['Student', 'password', 'TEXT', "NOT NULL DEFAULT ''"],
  ['Student', 'isPaidAccess', 'INTEGER', 'NOT NULL DEFAULT 0'],
  ['Student', 'parentName', 'TEXT', "NOT NULL DEFAULT ''"],
  ['Student', 'parentPhone', 'TEXT', "NOT NULL DEFAULT ''"],
  ['Student', 'deviceId', 'TEXT', "NOT NULL DEFAULT ''"],
  ['Student', 'deviceFp', 'TEXT', "NOT NULL DEFAULT ''"],
  // مكوّنات الجهاز الخام (JSON) — للمطابقة الذكية عند تعرّف نفس الجهاز
  ['Student', 'deviceTraits', 'TEXT', "NOT NULL DEFAULT ''"],
  // جهاز إنشاء الحساب — ثابت: بيتكتب وقت التسجيل بس والدخول بيتحقق ضده حصريًا
  ['Student', 'creationDeviceId', 'TEXT', "NOT NULL DEFAULT ''"],
  ['Student', 'creationDeviceFp', 'TEXT', "NOT NULL DEFAULT ''"],
  ['Student', 'deviceType', 'TEXT', "NOT NULL DEFAULT ''"],
  ['Student', 'allowAllDevices', 'INTEGER', 'NOT NULL DEFAULT 0'],
  ['Video', 'price', 'REAL', 'DEFAULT 0'],
  ['Video', 'fileType', 'TEXT', "DEFAULT ''"],
  ['Video', 'thumbnail', 'TEXT', "DEFAULT ''"],
  // nativeEmbed (كود HTML embed) اتلغت 2026-و4 بطلب المستر — العمود مش بيتضاف في قواعد جديدة
  ['Homework', 'questions', 'TEXT', "DEFAULT ''"],
  ['Homework', 'answerKeyPath', 'TEXT', "DEFAULT ''"],
  ['Homework', 'answerKeyType', 'TEXT', "DEFAULT ''"],
  ['Homework', 'thumbnail', 'TEXT', "DEFAULT ''"],
  ['Homework', 'fileType', 'TEXT', "DEFAULT ''"],
  ['Homework', 'content', 'TEXT', "DEFAULT ''"],
  ['Exam', 'questions', 'TEXT', "DEFAULT ''"],
  ['Exam', 'answerKeyPath', 'TEXT', "DEFAULT ''"],
  ['Exam', 'answerKeyType', 'TEXT', "DEFAULT ''"],
  ['Exam', 'thumbnail', 'TEXT', "DEFAULT ''"],
  ['Exam', 'fileType', 'TEXT', "DEFAULT ''"],
  ['Exam', 'content', 'TEXT', "DEFAULT ''"],
  // نماذج الامتحان العشوائية (JSON array) — كل طالب بيشوف نموذج واحد عشوائي
  ['Exam', 'models', 'TEXT', "DEFAULT ''"],
  // طريقة التوزيع (2026-و): random = عشوائي ثابت لكل طالب | fixed = نموذج واحد للكل
  ['Exam', 'modelMode', 'TEXT', "DEFAULT 'random'"],
  ['Exam', 'fixedModel', 'TEXT', "DEFAULT ''"],
  ['Exam', 'passScore', 'REAL', 'DEFAULT 50'],
  // (2026-و115) نهاية مدة الامتحان — «مدة الامتحان خلصت» ليومين ثم اختفاء تلقائي
  ['Exam', 'endsAt', 'DATETIME', ''],
  ['ExamResult', 'score', 'REAL', 'DEFAULT 0'],
  ['ExamResult', 'maxScore', 'REAL', 'DEFAULT 100'],
  ['ExamResult', 'answers', 'TEXT', "DEFAULT ''"],
  ['ExamResult', 'writingGrades', 'TEXT', "DEFAULT ''"],
  ['Announcement', 'content', 'TEXT', "DEFAULT ''"],
  ['Discussion', 'likes', 'INTEGER', 'NOT NULL DEFAULT 0'],
  ['Discussion', 'isAdminReply', 'INTEGER', 'NOT NULL DEFAULT 0'],
  ['Media', 'data', 'TEXT', "DEFAULT ''"],
  ['Media', 'category', 'TEXT', "DEFAULT 'general'"],
  ['Media', 'fileSize', 'TEXT', "DEFAULT ''"],
  ['GalleryImage', 'type', 'TEXT', "DEFAULT 'image'"],
  ['GalleryImage', 'videoUrl', 'TEXT', "DEFAULT ''"],
  // (و45) صورة مصغرة لعناصر الفيديو في المعرض — أوتوماتيك من اليوتيوب + قابلة للتعديل
  ['GalleryImage', 'thumbnail', 'TEXT', "DEFAULT ''"],
  ['GalleryImage', 'sortOrder', 'INTEGER', 'NOT NULL DEFAULT 0'],
  ['Payment', 'studentPhone', 'TEXT', "DEFAULT ''"],
  ['Payment', 'studentGrade', 'TEXT', "DEFAULT ''"],
  ['Payment', 'method', 'TEXT', "DEFAULT ''"],
  ['Payment', 'receiptType', 'TEXT', "DEFAULT ''"],
  ['Payment', 'note', 'TEXT', "DEFAULT ''"],
  ['Payment', 'reviewedAt', 'DATETIME', ''],
  ['Payment', 'reviewedBy', 'TEXT', "DEFAULT ''"],
  // (2026-و29) نظام المجموعات — عمود مجموعة الطالب + استهداف المجموعات للامتحانات والواجبات
  ['Student', 'groupId', 'TEXT', "DEFAULT ''"],
  ['Exam', 'targetGroupIds', 'TEXT', "DEFAULT ''"],
  ['Homework', 'targetGroupIds', 'TEXT', "DEFAULT ''"],
  // (و43) الكتب بلينك خارجي — عمود sourceUrl لجدول Book (التخزين على الدرايف مش في القاعدة)
  ['Book', 'sourceUrl', 'TEXT', "NOT NULL DEFAULT ''"],
]

var SCHEMA_FIXES = [
  'UPDATE Student SET password = \'\' WHERE password IS NULL',
  'UPDATE Student SET isPaidAccess = 0 WHERE isPaidAccess IS NULL',
  'UPDATE Student SET deviceId = \'\' WHERE deviceId IS NULL',
  'UPDATE Student SET deviceFp = \'\' WHERE deviceFp IS NULL',
  'UPDATE Student SET creationDeviceId = \'\' WHERE creationDeviceId IS NULL',
  'UPDATE Student SET creationDeviceFp = \'\' WHERE creationDeviceFp IS NULL',
  'UPDATE Student SET deviceTraits = \'\' WHERE deviceTraits IS NULL',
  'UPDATE Student SET deviceType = \'\' WHERE deviceType IS NULL',
  // ===== (و80) شيل ترحيلات القيم الإجبارية على SiteConfig (براند/أسماء/صور/فيفيكون) =====
  // كانت بتفرض نصوصًا وصورًا محددة في مفاتيح الهوية كل ما بصمة السكيما تتغير (كل نشر)
  // فبتلغي أي تعديل يعمله الأدمن من لوحة التحكم — وده سبب «التغييرات بترجع بعد
  // الـ reload». كل التصحيحات دي (Maths Genius→Zicola، أسماء المستر، صور الهيرو/النافيبار/الفيفيكون)
  // اتنفذت فعلًا على قاعدة الإنتاج من النشرات السابقة فمش محتاجين نكررها —
  // والقراءة في /api/config بقت ترجع قيم الداتابيز زي ما هي من غير أي تعديل.
  // ===== (و71) رابعة وخمسة ابتدائي — طلب المستر: «تضيف لي الصف الرابع
  // الابتدائي اسمه رابعة ابتدائي بالانجليزي Grade 4 وبعديه خمسة ابتدائي
  // Grade 5» — لو grades_data مش موجودة خالص بنكتب الافتراضي بسبعة صفوف،
  // ولو موجودة (حتى لو قديمة من غير رابعة/خامسة) الدمج بيحصل في الكود
  // gradesFromConfig — **ممنوع** نكتب فوق تخصيص الأدمن (idempotent).
  "INSERT INTO SiteConfig (id, key, value, updatedAt) SELECT 'cfg_grades_w71', 'grades_data', '[{\"ar\":\"الرابعة الابتدائي\",\"en\":\"Grade 4\",\"emoji\":\"4️⃣\",\"short\":\"G4\"},{\"ar\":\"الخامسة الابتدائي\",\"en\":\"Grade 5\",\"emoji\":\"5️⃣\",\"short\":\"G5\"},{\"ar\":\"السادس الابتدائي\",\"en\":\"Grade 6\",\"emoji\":\"6️⃣\",\"short\":\"G6\"},{\"ar\":\"أولى إعدادي\",\"en\":\"Prep 1\",\"emoji\":\"1️⃣\",\"short\":\"1\"},{\"ar\":\"تانية إعدادي\",\"en\":\"Prep 2\",\"emoji\":\"2️⃣\",\"short\":\"2\"},{\"ar\":\"تالتة إعدادي\",\"en\":\"Prep 3\",\"emoji\":\"3️⃣\",\"short\":\"3\"},{\"ar\":\"أولى ثانوي\",\"en\":\"1 Bac\",\"emoji\":\"🅱️\",\"short\":\"1B\"}]', CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM SiteConfig WHERE key = 'grades_data')",
  // الصفوف الافتراضية في الكود اتحدثت برضه — للقواعد اللي grades_data فيها
  // صفوف مخصصة من الأدمن بنحافظ عليها زي ما هي (الدمج في gradesFromConfig)
  // ===== ترحيل لمرة واحدة (idempotent) =====
  // الحسابات الموجودة اللي ملهاش ربط إنشاء: نثبّت الربط الحالي كـ"جهاز إنشاء"
  // عشان مفيش حساب يتحجب فجأة بعد الترقية. الربط ده بعدها **ثابت** — أي جهاز
  // غريب بيتمنع، والمستر يقدر يعمل "فك الربط" من لوحة التحكم لأي طالب.
  // مستثنى: القيم القديمة الفاشلة (null/undefined/dev_null/none) — الحسابات دي
  // هتتربط بأول جهاز يدخل بيه زي قبل بالظبط.
  "UPDATE Student SET creationDeviceId = deviceId, creationDeviceFp = deviceFp WHERE (creationDeviceId IS NULL OR creationDeviceId = '') AND ((deviceId IS NOT NULL AND deviceId != '' AND deviceId NOT IN ('null','undefined','dev_null','none')) OR (deviceFp IS NOT NULL AND deviceFp != '' AND deviceFp NOT IN ('null','undefined')))",
  'UPDATE Student SET allowAllDevices = 0 WHERE allowAllDevices IS NULL',
  'UPDATE Video SET price = 0 WHERE price IS NULL',
  'UPDATE Exam SET passScore = 50 WHERE passScore IS NULL',
  'UPDATE ExamResult SET score = 0 WHERE score IS NULL',
  'UPDATE ExamResult SET maxScore = 100 WHERE maxScore IS NULL',
  'UPDATE Payment SET amount = 0 WHERE amount IS NULL',
  // ===== (10-b) اسم المطوّر الصحيح «Adam Hawash» (Adam من غير h) — بطلب صاحب
  // المنصة حرفيًا. ترميم و78 القديمة كانت بترجّعه «Adham Hawash» — اتعكس هنا:
  // القيم المخزنة اللي فيها Adham بتتصحح Adam. idempotent: القيم الصح
  // مفيهاش Adham فمش هتتلمس.
  "UPDATE SiteConfig SET value = REPLACE(value, 'Adham Hawash', 'Adam Hawash') WHERE (key LIKE '%made_by%' OR key LIKE '%developer_label%') AND value LIKE '%Adham Hawash%'",
]

/* ============================================================
 * (Z-1) ترحيل تنظيف الجريدز — طلب المستر:
 * «شايف أكتر من صف أولى ثانوي بإملاءات مختلفة (أول ثانوي / اولي ثانوي /
 * أولى ثانوي) + فيه صف أولى بكالوريا المفروض مفيش في المنصة دي».
 * ------------------------------------------------------------
 * القواعد:
 *  1) أي صف في grades_data بيطابق عائلة «أولى ثانوي» بعد تطبيع الهمزات
 *     والمسافات والـ prefix («الصف») → بيتدمج في **صف واحد بالظبط**
 *     اسمه «أولى ثانوي» (يحافظ على موضع أول ظهور).
 *  2) أي صف فيه كلمة «بكالوريا» → يُحذف نهائيًا من القايمة، ومحتواه
 *     المربوط بالاسم القديم (فيديوهات/امتحانات/واجبات/طلاب/كتب/شكاوى/
 *     إعلانات/نقاشات/دفعات) بيتنقل لـ «أولى ثانوي» عشان مفيش فيديو يتيم
 *     (بكالوريا = أولى ثانوي نفس الصف حسب توحيد grade-names).
 *  3) schedule_data (مواعيد السنتر) بيتنظف بنفس الطريقة.
 *  - idempotent: بيشتغل مع كل تشغيل لـ ensureSchema (حتى لو بصمة
 *    السكيما متطابقة) وبيكتب **فقط لو فيه تغيير فعلي**.
 *  - ما بيلمسش أي صف تاني (سادس ابتدائي، إعدادي...) زي ما هو.
 * ============================================================ */
var GRADES_KEY = 'grades_data'
var SCHEDULE_KEY = 'schedule_data'
/* الاسم المعتمد الوحيد للصف الأول الثانوي في المنصة كلها */
var GRADE_S1_CANONICAL = 'أولى ثانوي'
/* قيم الافتراضي للصف الموحّد (نفس DEFAULT_GRADES في app-store) */
var GRADE_S1_DEFAULTS = { en: '1 Bac', emoji: '🅱️', short: '1B' }

/* تطبيع اسم الصف: شيل «الصف» + وحّد الهمزات والتاء المربوطة/الألف المقصورة
   والفاصلة تطويل + اطوي المسافات + lowercase (للأسماء اللاتينية) */
function normalizeGradeKey(name: any): string {
  var g = String(name || '')
  g = g.replace(/^\s*الصف\s+/u, '')
  g = g.replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627') // أ إ آ ٱ → ا
  g = g.replace(/\u0649/g, '\u064A')                     // ى → ي
  g = g.replace(/\u0640/g, '')                           // ـ tatweel
  g = g.replace(/[\u064B-\u0652]/g, '')                  // التشكيل
  g = g.replace(/\s+/g, ' ').trim().toLowerCase()
  return g
}

/* عائلة «أولى ثانوي» بعد التطبيع: أول ثانوي / اولي ثانوي / أولى ثانوي /
   1 ثانوي / first secondary / أولى لوحدها (تخزين قديم) */
function isFirstSecondaryGradeName(name: any): boolean {
  var g = normalizeGradeKey(name)
  if (!g) return false
  if (g === 'اولي ثانوي' || g === 'اول ثانوي') return true
  if (g === 'الاول الثانوي' || g === 'الثانوي الاول') return true
  if (g === '1 ثانوي' || g === '١ ثانوي' || g === 'ثانوي 1') return true
  if (g === 'first secondary' || g === 'first secondary grade' || g === 'secondary 1') return true
  if (g === 'اولي' || g === 'اول') return true /* «أولى» لوحدها = تخزين قديم لنفس الصف */
  return false
}

/* أي اسم فيه «بكالوريا» (بكل الصيغ) — ممنوع نهائيًا في المنصة دي.
   ملاحظة: en = '1 Bac' (اختصار لاتيني) مش بيتعلم — بس الاسم العربي
   والـ Baccalaureate الكامل بيتعلموا */
function isBaccalaureateGradeName(name: any): boolean {
  var raw = String(name || '')
  if (raw.indexOf('\u0628\u0643\u0627\u0644\u0648\u0631\u064A\u0627') !== -1) return true /* بكالوريا */
  var g = normalizeGradeKey(raw)
  if (g.indexOf('\u0628\u0643\u0627\u0644\u0648\u0631\u064A\u0627') !== -1) return true
  if (/bac{1,2}(ala|alau|cala)/i.test(g)) return true /* Baccalaureate (مش Bac) */
  return false
}

/* كل الجداول اللي بتحفظ الصف بالاسم النصي + عمودها (Payment بـ studentGrade) */
var GRADE_CONTENT_TABLES: Array<[string, string]> = [
  ['Video', 'grade'],
  ['Homework', 'grade'],
  ['Exam', 'grade'],
  ['Announcement', 'grade'],
  ['Discussion', 'grade'],
  ['Book', 'grade'],
  ['Student', 'grade'],
  ['Complaint', 'grade'],
  ['Payment', 'studentGrade'],
]

/* ============================================================
   (ص119 + توحيد الصفوف) عائلات صفوف الابتدائي انتقلت للمرجع الموحد
   src/lib/grade-names.ts (PRIMARY_GRADE_FAMILIES) — نفس الأسماء
   المعتمدة في DEFAULT_GRADES، ومعاها الأول/الثاني/التالتة الابتدائي —
   عشان كل مكان في المنصة ياخد نفس الاسم بالظبط (كتابة = قراءة = عرض).
   ============================================================ */
function canonicalPrimaryGrade(name: any): { ar: string; en: string; emoji: string; short: string } | null {
  return primaryGradeCanonical(name)
}

var _gradesMigrationDone = false

/* خريطة إعادة التسمية المتراكمة: (اسم قديم مخزّن) → (الاسم المعتمد الجديد).
   (ص119) بقت تستخدم لكل العائلات (أولى ثانوي + صفوف الابتدائي) بدل ما
   كل الأسماء الممسوحة كانت بتترجع لـ «أولى ثانوي» بس. */
var gradeRenames: Array<{ from: string; to: string }> = []
function pushGradeRename(from: string, to: string) {
  var f = String(from || '').trim()
  var t = String(to || '').trim()
  if (!f || !t || f === t) return
  for (var i = 0; i < gradeRenames.length; i++) {
    if (gradeRenames[i].from === f) { gradeRenames[i].to = t; return }
  }
  gradeRenames.push({ from: f, to: t })
}

/* الترحيل الفعلي — بيرجع ملخص للتشخيص. آمن للاستدعاء المتكرر. */
export async function migrateGradesData(client: any): Promise<{ changed: boolean; removedNames?: string[]; keptName?: string; scheduleFixed?: boolean }> {
  if (_gradesMigrationDone) return { changed: false }
  /* (ص119) تفقية خريطة التسميات بين التشغيلات — متغيرة عند كل تحميل */
  gradeRenames = []
  /* لو المفتاح مش موجود أصلًا (قاعدة جديدة) — الإدخال الافتراضي في
     SCHEMA_FIXES (cfg_grades_w71) هيتكتب بالقايمة الصح، ومفيش حاجة ننظفها */
  var rows: any
  try {
    rows = await client.execute({ sql: 'SELECT value FROM SiteConfig WHERE key = ? LIMIT 1', args: [GRADES_KEY] })
  } catch (e) { return { changed: false } }
  if (!rows || !rows.rows || rows.rows.length === 0) { _gradesMigrationDone = true; return { changed: false } }

  var raw = String(rows.rows[0].value || '')
  if (!raw.trim()) { _gradesMigrationDone = true; return { changed: false } }

  var parsed: any
  try { parsed = JSON.parse(raw) } catch (e) { _gradesMigrationDone = true; return { changed: false } }
  if (!Array.isArray(parsed) || parsed.length === 0) { _gradesMigrationDone = true; return { changed: false } }

  /* بناء القايمة النظيفة: صف واحد بالظبط «أولى ثانوي» من غير بكالوريا.
     لو «أولى بكالوريا» هي الممثلة الوحيدة للصف الأول الثانوي في القايمة
     (مفيش أي صف ثانوي تاني) — بيتحول لـ «أولى ثانوي» بدل ما نسيب المنصة
     من غير الصف ده خالص (نفس الصف بالاسمين حسب توحيد grade-names). */
  var hasNonBacS1 = false
  for (var pre = 0; pre < parsed.length; pre++) {
    var preAr = typeof (parsed[pre] || {}).ar === 'string' ? String(parsed[pre].ar) : ''
    if (preAr && !isBaccalaureateGradeName(preAr) && isFirstSecondaryGradeName(preAr)) { hasNonBacS1 = true; break }
  }
  var out: any[] = []
  var s1Kept = false
  var removedNames: string[] = []
  var changed = false
  for (var i = 0; i < parsed.length; i++) {
    var g: any = parsed[i] || {}
    var ar = typeof g.ar === 'string' ? g.ar : ''
    if (isBaccalaureateGradeName(ar)) {
      if (!s1Kept && !hasNonBacS1) {
        /* الصف ده هو الممثل الوحيد للصف الأول الثانوي → بيتحول بالاسم المعتمد */
        s1Kept = true
        out.push({
          ar: GRADE_S1_CANONICAL,
          en: typeof g.en === 'string' && g.en.trim() && !isBaccalaureateGradeName(g.en) ? g.en : GRADE_S1_DEFAULTS.en,
          emoji: typeof g.emoji === 'string' && g.emoji.trim() ? g.emoji : GRADE_S1_DEFAULTS.emoji,
          short: typeof g.short === 'string' && g.short.trim() ? g.short : GRADE_S1_DEFAULTS.short,
        })
        if (ar.trim() && removedNames.indexOf(ar.trim()) === -1) removedNames.push(ar.trim())
        pushGradeRename(ar, GRADE_S1_CANONICAL)
        changed = true
      } else {
        /* صف بكالوريا زيادة (فيه أولى ثانوي تاني في القايمة) → محذوف نهائيًا
           ومحتواه بيتنقل لـ أولى ثانوي */
        if (ar.trim() && ar.trim() !== GRADE_S1_CANONICAL && removedNames.indexOf(ar.trim()) === -1) removedNames.push(ar.trim())
        pushGradeRename(ar, GRADE_S1_CANONICAL)
        changed = true
      }
      continue
    }
    if (isFirstSecondaryGradeName(ar) || (isBaccalaureateGradeName(g.en) && !ar)) {
      if (!s1Kept) {
        /* أول ظهور — الاسم يبقى الصيغة المعتمدة بالظبط، والباقي بيتحفظ
           لو الأدمن مخصصه (وبيتكمل من الافتراضي لو ناقص) */
        s1Kept = true
        var item = {
          ar: GRADE_S1_CANONICAL,
          en: typeof g.en === 'string' && g.en.trim() && !isBaccalaureateGradeName(g.en) ? g.en : GRADE_S1_DEFAULTS.en,
          emoji: typeof g.emoji === 'string' && g.emoji.trim() ? g.emoji : GRADE_S1_DEFAULTS.emoji,
          short: typeof g.short === 'string' && g.short.trim() ? g.short : GRADE_S1_DEFAULTS.short,
        }
        if (ar !== GRADE_S1_CANONICAL) {
          if (ar.trim() && removedNames.indexOf(ar.trim()) === -1) removedNames.push(ar.trim())
          pushGradeRename(ar, GRADE_S1_CANONICAL)
          changed = true
        }
        if (JSON.stringify(item) !== JSON.stringify({ ar: ar, en: g.en, emoji: g.emoji, short: g.short })) changed = true
        out.push(item)
      } else {
        /* تكرار إضافي — بيتشال ومحتواه (لو الاسم مختلف عن المعتمد) بيتنقل */
        if (ar.trim() && ar.trim() !== GRADE_S1_CANONICAL && removedNames.indexOf(ar.trim()) === -1) removedNames.push(ar.trim())
        if (ar.trim() && ar.trim() !== GRADE_S1_CANONICAL) pushGradeRename(ar, GRADE_S1_CANONICAL)
        if (ar !== GRADE_S1_CANONICAL) changed = true
        changed = true
      }
      continue
    }
    out.push(g)
  }

  /* ============================================================
     (ص119) توحيد صفوف الابتدائي: أي اسم من عيلة رابعة/خامسة/سادسة
     ابتدائي بيتكتب بالصيغة المعتمدة (الرابعة/الخامسة/السادس الابتدائي)
     — طلب المستر: «سادس» ممنوع تفضل لوحدها.
     ============================================================ */
  for (var gp = 0; gp < out.length; gp++) {
    var gg: any = out[gp] || {}
    var gAr = typeof gg.ar === 'string' ? gg.ar : ''
    if (!gAr) continue
    var canon = canonicalPrimaryGrade(gAr)
    if (canon && gAr !== canon.ar) {
      if (gAr.trim() && removedNames.indexOf(gAr.trim()) === -1) removedNames.push(gAr.trim())
      pushGradeRename(gAr, canon.ar)
      out[gp] = {
        ar: canon.ar,
        en: typeof gg.en === 'string' && gg.en.trim() ? gg.en : canon.en,
        emoji: typeof gg.emoji === 'string' && gg.emoji.trim() ? gg.emoji : canon.emoji,
        short: typeof gg.short === 'string' && gg.short.trim() ? gg.short : canon.short,
      }
      changed = true
    }
  }

  /* ============================================================
     (توحيد الصفوف) دمج أي صفين بقى لهم نفس الاسم المعتمد بعد التوحيد —
     مثال: «الخامس» و«الخامسة الابتدائي» الاتنين بقوا «الخامسة الابتدائي»
     → صف واحد بس في القايمة (مفيش تكرار في القوائم المنسدلة). الأول
     بياخد بياناته والناقص فيه بيتكمل من المكرر.
     ============================================================ */
  var dedupSeen: Record<string, number> = {}
  var deduped: any[] = []
  for (var dd = 0; dd < out.length; dd++) {
    var dAr = typeof (out[dd] || {}).ar === 'string' ? String(out[dd].ar).trim() : ''
    if (!dAr) continue
    var dKey = normalizeGradeKey(dAr)
    if (dedupSeen[dKey] === undefined) {
      dedupSeen[dKey] = deduped.length
      deduped.push(out[dd])
    } else {
      var first: any = deduped[dedupSeen[dKey]] || {}
      var dup: any = out[dd] || {}
      if (!String(first.en || '').trim() && String(dup.en || '').trim()) first.en = dup.en
      if (!String(first.emoji || '').trim() && String(dup.emoji || '').trim()) first.emoji = dup.emoji
      if (!String(first.short || '').trim() && String(dup.short || '').trim()) first.short = dup.short
      changed = true
    }
  }
  out = deduped

  /* لو مفيش أي صف أولى ثانوي أصلًا مفيش حاجة نعملها للقايمة (الصف مش موجود) */

  if (changed) {
    /* 1) نقل المحتوى المربوط بالأسماء المصلحية قبل حذفها — مفيش فيديو يتيم.
       (ص119) كل اسم بيترجع للصف المعتمد بتاعه هو (من خريطة gradeRenames)
       — مش كل الأسماء لأولى ثانوي. */
    for (var rn = 0; rn < gradeRenames.length; rn++) {
      var oldName = gradeRenames[rn].from
      var newName = gradeRenames[rn].to
      for (var t = 0; t < GRADE_CONTENT_TABLES.length; t++) {
        try {
          await client.execute({
            sql: 'UPDATE ' + GRADE_CONTENT_TABLES[t][0] + ' SET ' + GRADE_CONTENT_TABLES[t][1] + ' = ? WHERE ' + GRADE_CONTENT_TABLES[t][1] + ' = ?',
            args: [newName, oldName],
          })
        } catch (e) { /* جدول ناقص في قاعدة قديمة — الترحيل مكمل */ }
      }
    }
    /* قيم مخزنة بتصيغات غريبة (مسافات/همزات) في جداول المحتوى — بنقرأ
       DISTINCT ونعيد تسمية أي قيمة بتطابق العائلة دي كمان */
    for (var t2 = 0; t2 < GRADE_CONTENT_TABLES.length; t2++) {
      var tbl = GRADE_CONTENT_TABLES[t2][0]
      var col = GRADE_CONTENT_TABLES[t2][1]
      try {
        var dist = await client.execute('SELECT DISTINCT ' + col + ' AS g FROM ' + tbl)
        if (dist && dist.rows) {
          for (var d = 0; d < dist.rows.length; d++) {
            var val = String(dist.rows[d].g || '')
            var trimmed = val.trim()
            if (!trimmed || trimmed === GRADE_S1_CANONICAL) continue
            /* (ص119) العائلات التلاتة: أولى ثانوي/بكالوريا + صفوف الابتدائي */
            var s1Family = isFirstSecondaryGradeName(trimmed) || isBaccalaureateGradeName(trimmed)
            var primaryCanon = canonicalPrimaryGrade(trimmed)
            if (s1Family || (primaryCanon && primaryCanon.ar !== trimmed)) {
              var target = s1Family ? GRADE_S1_CANONICAL : primaryCanon!.ar
              /* تحديث بالقيمة المخزنة زي ما هي (بالمسافات) — لو اتحدث قبل كده
                 الشرط بيرجع صفر صف = no-op آمن ومكرر التشغيل */
              try {
                await client.execute({ sql: 'UPDATE ' + tbl + ' SET ' + col + ' = ? WHERE ' + col + ' = ?', args: [target, val] })
              } catch (e2) {}
            }
          }
        }
      } catch (e3) { /* جدول ناقص */ }
    }
    /* 2) كتابة القايمة النظيفة */
    try {
      await client.execute({ sql: 'UPDATE SiteConfig SET value = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?', args: [JSON.stringify(out), GRADES_KEY] })
    } catch (e4) { return { changed: false } }
    /* 3) تنظيف مواعيد السنتر (schedule_data) بنفس القاعدة */
    try {
      var schRes = await client.execute({ sql: 'SELECT value FROM SiteConfig WHERE key = ? LIMIT 1', args: [SCHEDULE_KEY] })
      var schRaw = schRes && schRes.rows && schRes.rows[0] ? String(schRes.rows[0].value || '') : ''
      if (schRaw.trim()) {
        var sch = JSON.parse(schRaw)
        if (Array.isArray(sch)) {
          var schChanged = false
          for (var sd = 0; sd < sch.length; sd++) {
            var day = sch[sd] || {}
            if (!Array.isArray(day.slots)) continue
            for (var ss = 0; ss < day.slots.length; ss++) {
              var slotGrade = String((day.slots[ss] || {}).grade || '')
              if (!slotGrade) continue
              var slotTrim = slotGrade.trim()
              if (slotTrim !== GRADE_S1_CANONICAL && (isFirstSecondaryGradeName(slotGrade) || isBaccalaureateGradeName(slotGrade))) {
                day.slots[ss].grade = GRADE_S1_CANONICAL
                schChanged = true
              } else {
                /* (ص119) صفوف الابتدائي في المواعيد كمان تتوحّد */
                var slotCanon = canonicalPrimaryGrade(slotGrade)
                if (slotCanon && slotTrim !== slotCanon.ar) {
                  day.slots[ss].grade = slotCanon.ar
                  schChanged = true
                }
              }
            }
          }
          if (schChanged) {
            await client.execute({ sql: 'UPDATE SiteConfig SET value = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?', args: [JSON.stringify(sch), SCHEDULE_KEY] })
          }
        }
      }
    } catch (e5) { /* schedule_data مش موجود أو مش JSON — تجاهل آمن */ }
    return { changed: true, removedNames: removedNames, keptName: GRADE_S1_CANONICAL }
  }

  _gradesMigrationDone = true
  return { changed: false }
}

/* ============================================================
 * (S-3) الترحيل الفعلي لصفوف الجداول — المكمل الناقص لكوميت 825bdb9:
 * توحيد الصفوف السابق وحّد الكتابة (storeGrade) والقراءة
 * (gradeVariants/gradeWhere) بس **ما نفّذش أي UPDATE على الصفوف
 * القديمة المخزنة في قاعدة البيانات نفسها** — مسح DISTINCT جوه
 * migrateGradesData كان بيتنفذ فقط لو قايمة grades_data نفسها محتاجة
 * تنظيف، ففضل فيديوهات/امتحانات/طلاب بصيغ قديمة («الخامس»، «سادسة»،
 * «6»، «أولى بكالوريا»...). طلب المستر: «عاوز كله يبقى موحد — كل
 * الصفوف — البيانات كلها زي بعض».
 * ------------------------------------------------------------
 * القواعد:
 *  - لكل جدول فيه عمود صف (GRADE_CONTENT_TABLES):
 *      SELECT DISTINCT <col> AS g FROM <Table>
 *    ولكل قيمة: canonical = normalizeGrade(value) من المرجع الموحد
 *    src/lib/grade-names.ts → لو مختلف: UPDATE ... SET col = canonical
 *    WHERE col = value (بنفس نمط migrateGradesData بالظبط).
 *  - idempotent 100%: الصفوف اللي بالاسم المعتمد بيفضلوا زي ما هم
 *    (canonical === value → مفيش UPDATE) — التشغيل التاني بلاقي
 *    مفيش أي قيمة قديمة فبيعدّي من غير أي كتابة.
 *  - كل جدول في try/catch لوحده: جدول ناقص في قاعدة قديمة
 *    (no such table) بيتتجاهل بصمت والباقي بيكمّل.
 *  - راية _gradeRowsMigrationDone: مرة واحدة لكل عملية تشغيل سيرفر
 *    (أول نداء لـ ensureSchema قبل المسار السريع للبصمة) — والترحيل
 *    نفسه آمن يتكرر على أي حال (بيكتب فقط لو فيه تغيير فعلي).
 *  - نفس libsql client بتاع migrateGradesData (ممنوع Prisma هنا).
 * ============================================================ */
var _gradeRowsMigrationDone = false

export async function migrateGradeRows(client: any): Promise<{ changed: boolean; migrated: number; tables: number; renamed: Array<{ table: string; column: string; from: string; to: string }> }> {
  if (_gradeRowsMigrationDone) return { changed: false, migrated: 0, tables: 0, renamed: [] }
  var migrated = 0
  var tablesScanned = 0
  var renamed: Array<{ table: string; column: string; from: string; to: string }> = []
  for (var t = 0; t < GRADE_CONTENT_TABLES.length; t++) {
    var tbl = GRADE_CONTENT_TABLES[t][0]
    var col = GRADE_CONTENT_TABLES[t][1]
    /* كل جدول لوحده — جدول مش موجود (no such table) يتتجاهل بصمت */
    try {
      var dist = await client.execute('SELECT DISTINCT ' + col + ' AS g FROM ' + tbl)
      if (!dist || !dist.rows) continue
      tablesScanned++
      for (var d = 0; d < dist.rows.length; d++) {
        var val = String(dist.rows[d].g || '')
        if (!val.trim()) continue /* فاضي/NULL — مفيش حاجة نتوحّده */
        var canonical = normalizeGrade(val)
        if (!canonical || canonical === val) continue /* بالاسم المعتمد أصلًا — idempotent */
        try {
          await client.execute({ sql: 'UPDATE ' + tbl + ' SET ' + col + ' = ? WHERE ' + col + ' = ?', args: [canonical, val] })
          migrated++
          renamed.push({ table: tbl, column: col, from: val, to: canonical })
        } catch (eUp) { /* تحديث قيمة واحدة فشل — الباقي بيكمّل */ }
      }
    } catch (eTbl) { /* جدول ناقص في قاعدة قديمة — الترحيل مكمل */ }
  }
  _gradeRowsMigrationDone = true
  return { changed: migrated > 0, migrated: migrated, tables: tablesScanned, renamed: renamed }
}

/* (2026-و23) الفهارس الناقصة (بيئة SQLite مش بتعمل فهارس تلقائية
 * للـ Foreign Keys) — لوحة «طلابي» كانت بتعمل count/groupBy على
 * StudentActivity و ExamResult بفل سكان على كل الصفوف. الفهارس دي
 * بتخلي الاستعلامات فورية مهما كبر حجم السجلات.
 * ============================================================ */
export var SCHEMA_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_student_activity_student ON StudentActivity(studentId)',
  'CREATE INDEX IF NOT EXISTS idx_student_activity_action ON StudentActivity(studentId, action, createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_exam_result_student ON ExamResult(studentId)',
  'CREATE INDEX IF NOT EXISTS idx_exam_result_exam ON ExamResult(examId)',
  'CREATE INDEX IF NOT EXISTS idx_student_status_grade ON Student(status, grade)',
  'CREATE INDEX IF NOT EXISTS idx_hw_result_student ON HomeworkResult(studentId)',
  'CREATE INDEX IF NOT EXISTS idx_video_progress_student ON VideoProgress(studentId)',
  'CREATE INDEX IF NOT EXISTS idx_student_created ON Student(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_activity_created ON StudentActivity(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_student_group ON Student(groupId)',
  'CREATE INDEX IF NOT EXISTS idx_vgs_video ON VideoGroupSchedule(videoId)',
  'CREATE INDEX IF NOT EXISTS idx_vgs_group ON VideoGroupSchedule(groupId)',
  'CREATE INDEX IF NOT EXISTS idx_parent_student ON Parent(studentId)',
  'CREATE INDEX IF NOT EXISTS idx_notification_student ON Notification(studentId, read)',
  'CREATE INDEX IF NOT EXISTS idx_notification_created ON Notification(createdAt)',
]

export var CORE_TABLES = ['Admin', 'Student', 'StudentActivity', 'Video', 'Homework', 'Exam', 'ExamResult', 'Announcement', 'Discussion', 'SiteConfig', 'Media', 'VideoProgress', 'GalleryImage', 'Payment', 'VideoAccess', 'Complaint', 'Parent', 'Book', 'Notification', 'Challenge', 'ChallengeSolution']

/* (2026-و38) مفتاح البصمة اتبدل — البصمة القديمة كانت اتخزنت على الإنتاج
 * بعد ما كود و37 نزل (والجدول وقتها مش معمول لسه في CORE_TABLES فالترميم
 * اتخطى!) — وده كان سبب «حساب ولي أمر — حصلت مشكلة في إنشاء الحساب»:
 * جدول Parent مش موجود على Turso. بتغيير المفتاح أول ريكوست بعد النشر
 * بيعمل الفحص الكامل وينشئ أي جدول ناقص (Parent فوق كلهم). */
/* (2026-و40) مفتاح البصمة اتبدّل — جدول Book الجديد (الكتب والملازم) دخل
 * SCHEMA_TABLES + CORE_TABLES، وتغيير المفتاح بيضمن إن أول ريكوست بعد النشر
 * يعمل الفحص الكامل وينشئ الجدول على Turso (درس حادثة و38: جدول ناقص من
 * CORE_TABLES + بصمة قديمة = الجدول عمرك ما اتعمل على الإنتاج). */
/* (و43) مفتاح البصمة اتبدّل تاني — عمود Book.sourceUrl (الكتب بلينك خارجي)
 * دخل SCHEMA_TABLES + SCHEMA_COLUMNS، وتغيير المفتاح بيضمن إن أول ريكوست
 * بعد النشر يعمل الفحص الكامل وينفذ ALTER TABLE إضافة العمود على Turso
 * حتى لو الجدول نفسه موجود من و40 (درس حادثة و38/و40). */
/* (و44) مفتاح البصمة اتبدّل تالت — جدول Notification (الإشعارات) دخل
 * SCHEMA_TABLES + CORE_TABLES — نفس درس و38/و40: من غير تغيير المفتاح
 * الجدول الجديد عمرك ما بيتعمل على Turso بعد النشر. */
/* (و45) مفتاح البصمة اتبدّل رابع — عمود GalleryImage.thumbnail (صورة مصغرة
 * لفيديوهات المعرض) دخل SCHEMA_TABLES + SCHEMA_COLUMNS — نفس الدرس الموثق:
 * من غير البَمب العمود مش هيتضاف على Turso أول ريكوست بعد النشر. */
/* (و89) مفتاح البصمة اتبدّل — جدول ParentPushSubscription (اشتراكات
 * إشعارات Web Push لولي الأمر) دخل SCHEMA_TABLES — نفس الدرس الموثق
 * و38/و40/و43/و44/و45: من غير تغيير المفتاح الجدول مش هيتعمل على
 * قواعد Turso الموجودة أول ريكوست بعد النشر. */
var SCHEMA_HASH_KEY = 'schema_heal_hash_v2_w119_gradecanon'

/* ============================================================
 * 2026-و23 — **إصلاح بطء المنصة** (طلب المستر: «المنصة بطيئة، تسجيل
 * الدخول وطلابي بياخدوا وقت عقبال ما يحملوا»):
 * الجذر: كل إقلاع سيرفر (cold start على Vercel) كان بيشغّل الدورة
 * الكاملة: 48 محاولة ALTER TABLE (بتفشل كلها بـ duplicate) + ~21
 * UPDATE — يعني ~70 استعلام متسلسل على Turso بيضيفوا 2-4 ثواني على
 * أول طلب بعد كل إقلاع. الحل: بصمة (هاش) لبنية الجداول والأعمدة
 * والفهارس متخزنة في SiteConfig — لو البصمة مطابقة → تخطي كل حاجة
 * (استعلام واحد بس)، ولو اتغيرت البنية مستقبلًا → البصمة تتغير
 * والترميم بيشغّل لوحده من غير صيانة يدوية.
 * ============================================================ */
import { createHash } from 'crypto'

/* ============================================================
 * 2026-و30 — تسريع أول دخول (طلب المستر: «لما يجي يدخل الطفل الأولاني
 * بيقعد وقت... لو تقدر سرعه»):
 * (1) الترميم الكامل كان ~80 استعلام متسلسل على Turso (كل واحد =
 *     roundtrip شبكة) = 10-14 ثانية على أول طلب بعد كل نشر — بقوا
 *     **متوازيين** على دفعات = ~2 ثانية.
 * (2) ميمو على مستوى الموديول: بعد أول نجاح في نفس الـ instance
 *     مفيش حتى استعلام البصمة — الدوال بترجع فورًا.
 * ============================================================ */
var _schemaVerifiedInProcess = false

function currentSchemaHash(): string {
  var joined = SCHEMA_TABLES.join('||') + '##' +
    SCHEMA_COLUMNS.map(function (c) { return c.join('.') }).join('|') + '##' +
    SCHEMA_FIXES.join('##') + '##' +
    SCHEMA_INDEXES.join('##')
  return createHash('md5').update(joined).digest('hex').substring(0, 12)
}

/* تنفيذ استعلام متسامح: بيجرب مرتين (الدفعة المتوازية ممكن تصطدم بـ
   busy لحظي) وبيتجاهل duplicate/already exists — والفشل الحقيقي
   بيتسجل في النتايج من غير ما يبوّظ الباقي */
async function execTolerant(client: any, sql: string, meta: any, results: any[]) {
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      await client.execute(sql)
      if (results) results.push(Object.assign({ ok: true }, meta))
      return
    } catch (e: any) {
      var msg = String((e && e.message) || '')
      if (msg.indexOf('duplicate') !== -1 || msg.indexOf('already exists') !== -1) return
      if (attempt === 0) { await new Promise(function (r) { setTimeout(r, 250) }); continue }
      if (results) results.push(Object.assign({ ok: false, error: msg }, meta))
    }
  }
}

export async function ensureSchema(client: any, opts?: { force?: boolean }) {
  var force = !!(opts && opts.force)
  var results: any[] = []

  /* المسار الأسرع: الـ instance ده اتأكد من السكيما قبل كده → صفر استعلامات */
  if (!force && _schemaVerifiedInProcess) {
    return { missing: [], repaired: false, skipped: true, memo: true, results: [] }
  }

  /* ============================================================
   * (Z-1) ترحيل تنظيف الجريدز — بيشتغل مع كل تشغيل لضمان إن التكرارات
   * (أول ثانوي/اولي ثانوي/أولى ثانوي) وصف «أولى بكالوريا» يتشالوا من
   * grades_data حتى لو بصمة السكيما متطابقة (idempotent — بيكتب فقط
   * لو فيه تغيير فعلي وينقل المحتوى المربوط قبل حذف أي صف).
   * ============================================================ */
  try {
    var gm = await migrateGradesData(client)
    if (gm && gm.changed) {
      results.push({ gradesMigration: gm })
      console.log('[ensure-schema] grades_data cleanup:', JSON.stringify(gm))
    }
  } catch (eGm) { /* الترحيل خدمة تنظيف — فشله ما يمنعش السكيما */ }

  /* ============================================================
   * (S-3) ترحيل الصفوف المخزنة فعليًا في جداول المحتوى — نفس مكان
   * migrateGradesData (أول نداء في العملية قبل المسار السريع للبصمة،
   * وبعد كده الـ memo بيرجع فورًا) وبنفس نمط العلم والتسجيل.
   * ============================================================ */
  try {
    var gr = await migrateGradeRows(client)
    if (gr && gr.changed) {
      results.push({ gradeRowsMigration: gr })
      console.log('[ensure-schema] grade rows migration:', JSON.stringify(gr))
    }
  } catch (eGr) { /* ترحيل صفوف — فشله ما يمنعش السكيما */ }

  /* المسار السريع: البصمة متخزنة ومطابقة → مفيش أي ترميم محتاج
     (استعلام واحد بدل ~70 — ده اللي هيخلي الدخول ولوحة الطلاب فورًا) */
  if (!force) {
    try {
      var flagRes = await client.execute({
        sql: 'SELECT value FROM SiteConfig WHERE key = ? LIMIT 1',
        args: [SCHEMA_HASH_KEY],
      })
      var stored = flagRes && flagRes.rows && flagRes.rows.length > 0 ? String(flagRes.rows[0].value || '') : ''
      if (stored && stored === currentSchemaHash()) {
        _schemaVerifiedInProcess = true
        return { missing: [], repaired: false, skipped: true, results: [] }
      }
    } catch (e) {
      // لو الجدول نفسه مش موجود (قاعدة جديدة) → الدورة الكاملة تحت
    }
  }

  // Which core tables already exist?
  var existing: string[] = []
  try {
    var res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
    for (var i = 0; i < res.rows.length; i++) existing.push(String(res.rows[i].name))
  } catch (e) {}

  var missing = CORE_TABLES.filter(function (t) { return existing.indexOf(t) === -1 })

  // Only run DDL when something is actually missing (or when forced by explicit setup)
  var tablesToRun = (missing.length > 0 || force) ? SCHEMA_TABLES : []
  // (2026-و30) الجداول متوازية — مستقلة عن بعض (IF NOT EXISTS)
  await Promise.all(tablesToRun.map(function (sql) {
    var name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]
    return execTolerant(client, sql, { table: name }, results)
  }))

  // Columns (tolerant of duplicates) — (2026-و30) على دفعات متوازية بدل تسلسلي
  var CHUNK = 8
  for (var k = 0; k < SCHEMA_COLUMNS.length; k += CHUNK) {
    await Promise.all(SCHEMA_COLUMNS.slice(k, k + CHUNK).map(function (c) {
      var sql = 'ALTER TABLE ' + c[0] + ' ADD COLUMN ' + c[1] + ' ' + c[2] + ' ' + c[3]
      return execTolerant(client, sql, { table: c[0], column: c[1] }, results)
    }))
  }

  // NULL fixes — (2026-و30) متوازية (كلها idempotent)
  await Promise.all(SCHEMA_FIXES.map(function (sql) {
    return client.execute(sql).catch(function () {})
  }))

  // Indexes (idempotent — CREATE INDEX IF NOT EXISTS) — متوازية
  await Promise.all(SCHEMA_INDEXES.map(function (sql) {
    return execTolerant(client, sql, { index: sql }, results)
  }))

  _schemaVerifiedInProcess = true

  // تخزين بصمة البنية — الإقلاعات الجاية بتتخطى الترميم كله
  try {
    var hash = currentSchemaHash()
    try {
      await client.execute({ sql: 'UPDATE SiteConfig SET value = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?', args: [hash, SCHEMA_HASH_KEY] })
    } catch (uErr) {
      try {
        await client.execute({ sql: 'INSERT INTO SiteConfig (id, key, value) VALUES (?, ?, ?)', args: ['sch' + hash + Date.now().toString(36), SCHEMA_HASH_KEY, hash] })
      } catch (iErr) {}
    }
  } catch (hErr) {}

  return { missing, repaired: missing.length > 0, results }
}
