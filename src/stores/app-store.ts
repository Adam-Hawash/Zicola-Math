import { create } from 'zustand'

export type AppView =
  | 'landing'
  | 'auth-login'
  | 'auth-register'
  | 'student-pending'
  | 'student-portal'
  | 'admin-dashboard'
  | 'student-payment'
  | 'parent-login'
  | 'parent-register'
  | 'parent-portal'

/* (2026-و37) حساب ولي الأمر — جلسة مستقلة عن الطالب (mg_parent في localStorage)
   الوالد بيتربط بحساب ابنه بـ studentId وبيشوف متابعة نتايجه من غير ما يسجل دخول بجهاز ابنه */
export interface ParentStudentInfo {
  id: string
  name: string
  grade: string
  status: string
  isPaidAccess?: boolean
}

export interface ParentInfo {
  id: string
  name: string
  phone: string
  studentId: string
  student?: ParentStudentInfo | null
}

export interface Student {
  id: string
  name: string
  phone: string
  grade: string
  status: string
  isPaidAccess: boolean
  parentName: string
  parentPhone: string
  loginCount: number
  lastLogin: string | null
  watchedVideoCount?: number
  createdAt: string
  updatedAt: string
}

export interface ExamResult {
  id: string
  examId: string
  studentId: string
  /* 2026-و12 — النتيجة ممنوعة على الطالب (طلب المستر) — الـ API للطالب
     مبيرجعش درجات خالص، فالحقول دي بقت اختيارية */
  score?: number
  maxScore?: number
  submittedAt: string
  student?: { name: string; phone: string; grade: string; status: string }
}

export interface GalleryImage {
  id: string
  title: string
  filePath: string
  type: string
  videoUrl: string
  thumbnail?: string // (و45) صورة مصغرة لعناصر الفيديو (أوتوماتيك من اليوتيوب)
  sortOrder: number
  createdAt: string
}

export interface Admin {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Video {
  id: string
  title: string
  url: string
  filePath: string
  fileType: string
  thumbnail: string
  grade: string
  price: number
  /* (و104) درس بفيديوهات متعددة — نفس groupKey = نفس الدرس وorderIndex = الترتيب */
  groupKey?: string
  orderIndex?: number
  createdAt: string
}

export interface Homework {
  id: string
  title: string
  content: string
  filePath: string
  fileType: string
  thumbnail: string
  grade: string
  createdAt: string
}

export interface Exam {
  id: string
  title: string
  content: string
  filePath: string
  fileType: string
  thumbnail: string
  grade: string
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  grade: string
  createdAt: string
}

export interface Discussion {
  id: string
  studentId: string
  studentName: string
  grade: string
  content: string
  isAdminReply: boolean
  createdAt: string
}

export interface StudentActivity {
  id: string
  studentId: string
  action: string
  details: string
  createdAt: string
  student?: { name: string; grade: string; phone: string; status: string }
}

export const GRADES = [
  'رابعة ابتدائي',
  'خمسة ابتدائي',
  'الصف السادس الابتدائي',
  'أولى إعدادي',
  'تانية إعدادي',
  'تالتة إعدادي',
  'أولى ثانوي',
] as const

export const GRADE_SHORT_NAMES: Record<string, string> = {
  'رابعة ابتدائي': 'G4',
  'خمسة ابتدائي': 'G5',
  'الصف السادس الابتدائي': 'G6',
  'أولى إعدادي': '1',
  'تانية إعدادي': '2',
  'تالتة إعدادي': '3',
  'أولى ثانوي': '1B',
}

export const GRADES_EN = [
  { ar: 'رابعة ابتدائي', en: 'Grade 4', icon: 'G4' },
  { ar: 'خمسة ابتدائي', en: 'Grade 5', icon: 'G5' },
  { ar: 'الصف السادس الابتدائي', en: 'Grade 6', icon: 'G6' },
  { ar: 'أولى إعدادي', en: 'Prep 1', icon: '1' },
  { ar: 'تانية إعدادي', en: 'Prep 2', icon: '2' },
  { ar: 'تالتة إعدادي', en: 'Prep 3', icon: '3' },
  { ar: 'أولى ثانوي', en: '1 Bac', icon: '1B' },
] as const

// ============================================================
// (24-b) الصفوف الدراسية الديناميكية — طلب المستر:
// «أقدر أضيف صف، أمسح صف، أخلي الاسم بالعربي وبالإنجليزي
// والإيموجي بتاعه اللي هو يظهر فوق الصورة»
// DEFAULT_GRADES = نفس الصفوف الحالية في GRADES و GRADES_EN
// (متلمةسش القايمتين دول عشان التوافق الخلفي مع باقي الكود)
// ============================================================
export interface GradeItem {
  ar: string
  en: string
  emoji: string
  short: string
}

export const DEFAULT_GRADES: GradeItem[] = [
  /* (و71) رابعة وخمسة ابتدائي — قبل السادس الابتدائي (الترتيب المدرسي)
     (ص119) الأسماء بقت بالصيغة المعتمدة الكاملة — طلب المستر: «سادس»
     لوحدها ممنوع، لازم «السادس الابتدائي» — وترحيل ensure-schema بيوحّد
     أي أسماء قديمة مخزنة في قاعدة البيانات لصيغتي دي تلقائيًا */
  { ar: 'الرابعة الابتدائي', en: 'Grade 4', emoji: '4️⃣', short: 'G4' },
  { ar: 'الخامسة الابتدائي', en: 'Grade 5', emoji: '5️⃣', short: 'G5' },
  { ar: 'السادس الابتدائي', en: 'Grade 6', emoji: '6️⃣', short: 'G6' },
  { ar: 'أولى إعدادي', en: 'Prep 1', emoji: '1️⃣', short: '1' },
  { ar: 'تانية إعدادي', en: 'Prep 2', emoji: '2️⃣', short: '2' },
  { ar: 'تالتة إعدادي', en: 'Prep 3', emoji: '3️⃣', short: '3' },
  { ar: 'أولى ثانوي', en: '1 Bac', emoji: '🅱️', short: '1B' },
]

// بتفك JSON من siteConfig.grades_data (المفتاح اللي لوحة الأدمن بتكتب فيه)
// ولو فاشل/فاضي بترجّع DEFAULT_GRADES — كل شاشات العرض بتقرأ من هنا
// ============================================================
// (Z-1) حارس توحيد «أولى ثانوي» — نفس قواعد ترحيل ensure-schema بس للعرض:
//  • أي صف فيه «بكالوريا» ممنوع يظهر في المنصة
//  • كل صيغ «أول ثانوي/اولي ثانوي/أولى ثانوي» بتشتغل = صف واحد «أولى ثانوي»
// حماية عرض لو داتابيز لسه ما عدّتش ترحيل التنظيف (idempotent للعرض بس)
// ============================================================
function normArGradeName(name: string): string {
  var g = String(name || '')
  g = g.replace(/^\s*الصف\s+/, '')
  g = g.replace(/[أإآٱ]/g, 'ا')
  g = g.replace(/ى/g, 'ي')
  g = g.replace(/\s+/g, ' ').trim().toLowerCase()
  return g
}

export function isFirstSecondaryGradeName(name: string): boolean {
  var g = normArGradeName(name)
  if (!g) return false
  if (g === 'اولي ثانوي' || g === 'اول ثانوي' || g === 'الاول الثانوي' || g === 'الثانوي الاول') return true
  if (g === '1 ثانوي' || g === '١ ثانوي' || g === 'ثانوي 1') return true
  if (g === 'first secondary' || g === 'first secondary grade' || g === 'secondary 1') return true
  if (g === 'اولي' || g === 'اول') return true
  return false
}

export function isBaccalaureateGradeName(name: string): boolean {
  var g = String(name || '')
  if (g.indexOf('بكالوريا') !== -1) return true
  if (/bac{1,2}(ala|alau|cala)/i.test(g)) return true
  return false
}

export function gradesFromConfig(siteConfig: SiteConfig | null | undefined): GradeItem[] {
  try {
    var raw = siteConfig ? siteConfig.grades_data : null
    if (typeof raw === 'string' && raw.trim() !== '') {
      var parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        var items: GradeItem[] = []
        for (var i = 0; i < parsed.length; i++) {
          var g: any = parsed[i] || {}
          items.push({
            ar: typeof g.ar === 'string' ? g.ar : '',
            en: typeof g.en === 'string' ? g.en : '',
            emoji: typeof g.emoji === 'string' ? g.emoji : '',
            short: typeof g.short === 'string' ? g.short : (typeof g.en === 'string' && g.en ? g.en : (typeof g.ar === 'string' ? g.ar : '')),
          })
        }
        // لو في صف واحد على الأقل ليه اسم عربي نرجع القايمة، غير كده فولباك
        var hasAny = false
        for (var j = 0; j < items.length; j++) {
          if (items[j].ar.trim() !== '') { hasAny = true; break }
        }
        if (hasAny) {
          /* (Z-1) توحيد «أولى ثانوي» في صف واحد بالظبط + شيل أي صف بكالوريا
             (نفس قواعد ترحيل ensure-schema) — قبل دمج رابعة/خمسة ابتدائي */
          var hasNonBacS1 = false
          for (var hb = 0; hb < items.length; hb++) {
            var hbAr = items[hb].ar || ''
            if (hbAr && !isBaccalaureateGradeName(hbAr) && isFirstSecondaryGradeName(hbAr)) { hasNonBacS1 = true; break }
          }
          var cleaned: GradeItem[] = []
          var s1Added = false
          for (var ci = 0; ci < items.length; ci++) {
            var cAr = items[ci].ar || ''
            if (isBaccalaureateGradeName(cAr)) {
              if (!s1Added && !hasNonBacS1) {
                /* بكالوريا هي الممثل الوحيد للصف الأول الثانوي → بتتحول بالاسم المعتمد */
                s1Added = true
                cleaned.push({ ar: 'أولى ثانوي', en: '1 Bac', emoji: '🅱️', short: '1B' })
              }
              continue
            }
            if (isFirstSecondaryGradeName(cAr)) {
              if (s1Added) continue
              s1Added = true
              cleaned.push({
                ar: 'أولى ثانوي',
                en: items[ci].en || '1 Bac',
                emoji: items[ci].emoji || '🅱️',
                short: items[ci].short || '1B',
              })
              continue
            }
            cleaned.push(items[ci])
          }
          items = cleaned
          /* (ص123) اتشال حقن «رابعة/خمسة ابتدائي» القديم (و71) — طلب المستر:
             «اللي موجودة في صفحة الادمن هي اللي تبقى موجودة» — قايمة الصفوف
             في كل المنصة = grades_data بتاعت الأدمن بالظبط من غير أي إضافة
             تلقائية من الكود. الأدمن يضيف/يعدل الصفين دول من لوحة الصفوف
             ولو عايزهم هيحفظهم هو. */
          return items
        }
      }
    }
  } catch (e) { /* فولباك تحت */ }
  return DEFAULT_GRADES
}

export interface Stats {
  totalStudents: number
  pendingStudents: number
  approvedStudents: number
  totalVideos: number
  totalHomework: number
  totalExams: number
  totalAnnouncements: number
  totalDiscussions: number
  grades: string[]
  pendingPayments?: number
}

export interface SiteConfig {
  [key: string]: string
}

export interface SocialLinks {
  social_facebook: string
  social_whatsapp_channel: string
  social_instagram: string
  social_youtube: string
}

interface AppState {
  currentView: AppView
  setView: (view: AppView) => void

  currentStudent: Student | null
  setCurrentStudent: (student: Student | null) => void
  currentParent: ParentInfo | null
  setCurrentParent: (parent: ParentInfo | null) => void
  currentAdmin: Admin | null
  setCurrentAdmin: (admin: Admin | null) => void
  isAdminLoggedIn: boolean
  setAdminLoggedIn: (v: boolean) => void

  showStudentLogin: boolean
  setShowStudentLogin: (v: boolean) => void
  showStudentRegister: boolean
  setShowStudentRegister: (v: boolean) => void
  showAdminLogin: boolean
  setShowAdminLogin: (v: boolean) => void

  adminTab: string
  setAdminTab: (tab: string) => void
  studentTab: string
  setStudentTab: (tab: string) => void

  siteConfig: SiteConfig
  setSiteConfig: (config: SiteConfig) => void
  configLoaded: boolean
  setConfigLoaded: (v: boolean) => void

  socialLinks: SocialLinks
  setSocialLinks: (links: SocialLinks) => void

  stats: Stats | null
  setStats: (stats: Stats | null) => void

  galleryImages: GalleryImage[]
  setGalleryImages: (images: GalleryImage[]) => void

  pendingPaymentVideo: { id: string; title: string; price: number; grade: string } | null
  setPendingPaymentVideo: (v: { id: string; title: string; price: number; grade: string } | null) => void

  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  setView: (view) => set({ currentView: view }),

  currentStudent: null,
  // ربط الجلسة بين الصفحات: /videos/[id] وصفحة الدفع بيبوا على localStorage
  // (mg_student) لأنهم routes منفصلة والـ store بيتصفّر مع كل تحميل صفحة.
  // من غير الحفظ ده: صفحة الفيديو بتفتح من غير هوية الطالب → مفيش ووترمارك
  // باسمه + التقدم مش بيتحفظ + الفيديوهات المدفوعة بتبان مقفولة (مش بيفتح).
  setCurrentStudent: (student) => {
    try {
      if (typeof window !== 'undefined') {
        if (student) localStorage.setItem('mg_student', JSON.stringify(student))
        else localStorage.removeItem('mg_student')
      }
    } catch (e) {}
    set({ currentStudent: student })
  },
  currentAdmin: null,
  setCurrentAdmin: (admin) => set({ currentAdmin: admin }),
  currentParent: null,
  // (2026-و37) جلسة ولي الأمر زي جلسة الطالب بالظبط: localStorage حتى ترجع
  // بعد الـ reload من غير تسجيل دخول من الأول (نفس علاج مشكلة الخروج)
  setCurrentParent: (parent) => {
    try {
      if (typeof window !== 'undefined') {
        if (parent) localStorage.setItem('mg_parent', JSON.stringify(parent))
        else localStorage.removeItem('mg_parent')
      }
    } catch (e) {}
    set({ currentParent: parent })
  },
  isAdminLoggedIn: false,
  setAdminLoggedIn: (v) => set({ isAdminLoggedIn: v }),

  showStudentLogin: false,
  setShowStudentLogin: (v) => set({ showStudentLogin: v }),
  showStudentRegister: false,
  setShowStudentRegister: (v) => set({ showStudentRegister: v }),
  showAdminLogin: false,
  setShowAdminLogin: (v) => set({ showAdminLogin: v }),

  adminTab: 'students',
  setAdminTab: (tab) => set({ adminTab: tab }),
  studentTab: 'videos',
  setStudentTab: (tab) => set({ studentTab: tab }),

  siteConfig: {},
  setSiteConfig: (config) => set({ siteConfig: config }),
  configLoaded: false,
  setConfigLoaded: (v) => set({ configLoaded: v }),

  socialLinks: {
    social_facebook: '',
    social_whatsapp_channel: '',
    social_instagram: '',
    social_youtube: '',
  },
  setSocialLinks: (links) => set({ socialLinks: links }),

  stats: null,
  setStats: (stats) => set({ stats }),

  galleryImages: [],
  setGalleryImages: (images) => set({ galleryImages: images }),

  pendingPaymentVideo: null,
  setPendingPaymentVideo: (v) => set({ pendingPaymentVideo: v }),

  logout: () =>
    set({
      currentStudent: null,
      currentParent: null,
      currentAdmin: null,
      isAdminLoggedIn: false,
      currentView: 'landing',
      adminTab: 'students',
      studentTab: 'videos',
      showStudentLogin: false,
      showStudentRegister: false,
      showAdminLogin: false,
      pendingPaymentVideo: null,
    }),
}))
