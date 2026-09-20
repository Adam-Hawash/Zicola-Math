// @ts-nocheck
import { NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'

var DEFAULTS = {
  // === Navbar ===
  navbar_brand: 'Zicola Math',
  navbar_subtitle: 'مستر زيكولا',

  // === Hero Section ===
  hero_badge: 'منصة تعليمية متكاملة | Comprehensive Learning Platform',
  hero_title_line1: 'Zicola in Math',
  hero_title_line2: 'مستر زيكولا',
  hero_subtitle: 'نبسّط لك الرياضيات ونجعلها سهلة وممتعة! Algebra, Geometry, Formulas, Cheat Sheets — واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة لتقدّمك الأكاديمي.',
  hero_stat1_value: '8+',
  hero_stat1_label: 'Grade Levels',
  hero_stat2_value: '100+',
  hero_stat2_label: 'Video Lessons',
  hero_stat3_value: '24/7',
  hero_stat3_label: 'Progress Tracking',
  hero_developer_url: 'https://prime-developer-portfolio-11.vercel.app',
  hero_developer_label: 'Hero Developer',
  footer_made_by_label: 'Developed by Adam Hawash',
  prime_developer_url: 'https://prime-developer-portfolio-11.vercel.app',

  // === Schedule Page ===
  schedule_title: 'مواعيد السنتر',
  schedule_subtitle: 'جدول مواعيد الحصص الأسبوعية لكل الصفوف الدراسية — اختر اليوم المناسب لك وتابع موعد حصتك',
  schedule_badge: 'جدول الحصص الأسبوعي',
  schedule_footer_note: 'جميع المواعيد بتوقيت القاهرة. لو عندك أي استفسار عن موعد حصتك تواصل معنا عبر واتساب.',
  schedule_brand: 'Zicola in Math',
  schedule_data: '',

  // === Instructor ===
  instructor_name: 'مستر زيكولا',
  instructor_title: 'Mathematics Specialist | معلم الرياضيات المتخصص',
  instructor_photo: '',

  // === Features Section ===
  features_title: 'لماذا تختارنا؟ | Why Choose Us?',
  features_subtitle: 'نقدّم لك تجربة تعليمية فريدة تجمع بين الشرح المبسط والتطبيق العملي في Algebra, Geometry, and More',
  feature1_title: 'شرح مبسط | Simplified Explanations',
  feature1_desc: 'شرح واضح ومبسط لكل درس رياضيات بطريقة تساعد الطالب على الفهم السريع والاستيعاب العميق لمفاهيم Algebra و Geometry الأساسية.',
  feature2_title: 'فهم العمليات | Deep Understanding',
  feature2_desc: 'نركّز على فهم العمليات الرياضية من الجذور وليس الحفظ فقط، مما يبني قدرة حقيقية على حل أي مسألة في Formulas و Problem Solving.',
  feature3_title: 'حل المسائل | Step-by-Step Solutions',
  feature3_desc: 'حل خطوة بخطوة للمسائل المعقدة مع Cheat Sheets وملخصات بصرية تسهّل الفهم والتذكّر.',
  feature4_title: 'تحضير وامتحانات | Reviews & Exams',
  feature4_desc: 'تحضير شامل ومراجعات دورية واختبارات أسبوعية لضمان التفوّق والاستعداد الكامل للامتحانات النهائية.',

  // === Grades Section ===
  grades_title: 'السنوات الدراسية',
  grades_subtitle: 'اختر صفك الدراسي للوصول إلى المحتوى التعليمي المخصص لك',

  // === Tips Section ===
  tips_badge: 'نصائح للتفوّق | Tips for Excellence',
  tips_title: 'نصائح المستر | Tips',
  tips_subtitle: 'نصائح ذهبية من مستر زيكولا للتفوّق في الرياضيات — Golden advice from Zicola Math',
  tips_card1_title: 'حدد وقت يومي للمراجعة',
  tips_card1_title_en: 'Set Daily Review Time',
  tips_card1_desc: 'خصص 20-30 دقيقة كل يوم لمراجعة ما تعلمته. الاستمرارية هي مفتاح التفوّق في الرياضيات. Dedicate 20-30 minutes daily for review.',
  tips_card2_title: 'ركز على الفهم وليس الحفظ',
  tips_card2_title_en: 'Focus on Understanding, Not Memorization',
  tips_card2_desc: 'حاول فهم لماذا وليس كيف فقط. الفهم العميق يبقي المعلومة لفترة أطول ويساعدك في حل مسائل جديدة. Understand why, not just how.',
  tips_card3_title: 'حل مسائل إضافية كل يوم',
  tips_card3_title_en: 'Solve Extra Problems Daily',
  tips_card3_desc: 'لا تكتفي بالواجبات فقط. حل مسائل إضافية من الكتاب المدرسي لتعزيز مهاراتك. Practice beyond homework for stronger skills.',
  tips_card4_title: 'لا تتردد في السؤال',
  tips_card4_title_en: 'Never Hesitate to Ask',
  tips_card4_desc: 'إذا لم تفهم شيئاً اسأل فوراً. السؤال الجيد هو بداية الفهم العميق. Ask immediately when something is unclear.',

  // === Guide Section ===
  guide_badge: 'دليلك التعليمي | Learning Guide',
  guide_title: 'كيف تستخدم المنصة؟ | How to Use the Platform',
  guide_subtitle: 'ست خطوات بسيطة لتبدأ رحلتك التعليمية في Zicola Math — Six simple steps to begin your learning journey',
  guide_card1_title: 'تسجيل حسابك',
  guide_card1_title_en: 'Register',
  guide_card1_desc: 'أنشئ حسابك في المنصة بسرعة وسهولة. اختر صفّك الدراسي وابدأ رحلتك التعليمية فوراً. Create your account quickly and start learning.',
  guide_card2_title: 'مشاهدة الدروس',
  guide_card2_title_en: 'Watch Lessons',
  guide_card2_desc: 'تابع شروحات مبسّطة ومتسلسلة لكل درس رياضيات بأسلوب تفاعلي يجعل الفهم أسهل. Watch simplified, step-by-step video lessons.',
  guide_card3_title: 'حل الواجبات',
  guide_card3_title_en: 'Homework',
  guide_card3_desc: 'أكمل واجباتك الأسبوعية وحلّ التمارين لتثبيت المعلومات واختبار فهمك. Complete weekly homework to reinforce your learning.',
  guide_card4_title: 'أداء الامتحانات',
  guide_card4_title_en: 'Take Exams',
  guide_card4_desc: 'شارك في الامتحانات الدورية لمتابعة مستوايك والاستعداد للامتحانات النهائية. Take periodic exams to track your progress.',
  guide_card5_title: 'بطاقات تعليمية',
  guide_card5_title_en: 'Flashcards',
  guide_card5_desc: 'استخدم البطاقات التعليمية لمراجعة المصطلحات والقوانين الرياضية بشكل سريع. Review formulas and terms with flashcards.',
  guide_card6_title: 'تحديات ومسابقات',
  guide_card6_title_en: 'Challenges',
  guide_card6_desc: 'تنافس مع زملائك في تحديات رياضية ممتعة واربح مراكز متقدمة. Compete in fun math challenges with your classmates.',

  // === Gallery ===
  gallery_title: 'صور طلابي الأعزاء | My Beloved Students',
  gallery_subtitle: 'لحظات مميزة من رحلتنا التعليمية — Moments from our educational journey',

  // === Social Links ===
  social_facebook: '',
  social_whatsapp_channel: '',
  social_instagram: '',
  social_youtube: '',

  // === WhatsApp Button ===
  whatsapp_number: '201000000000',

  // === Footer ===
  footer_brand: 'Zicola Math',
  footer_copyright: 'جميع الحقوق محفوظة لـ أدهم حواش',

  // === Favicon ===
  favicon_url: '',

  // === Tips Section Background ===
  tips_bg_image: '',

  // === Tips Section Center Image ===
  tips_section_image: '',

  // === API Keys ===
  resend_api_key: '',

  // === Payment Numbers (shown to students) ===
  payment_vodafone_cash: '',
  payment_instapay: '',
  payment_fawry: '',
}

export async function GET() {
  try {
    var configs = await db.siteConfig.findMany()
    var map = Object.assign({}, DEFAULTS)
    for (var i = 0; i < configs.length; i++) {
      var c = configs[i]
      map[c.key] = c.value
    }
    // اسم المنصة الصحيح: Zicola Math (من غير s) — لو قاعدة البيانات لسه فيها
    // الاسم القديم من نسخة قديمة بنصلحه على القراءة، والترحيل في ensure-schema
    // بصلحه نهائيًا في قاعدة البيانات
    var brandKeys = ['navbar_brand', 'hero_title_line1', 'footer_brand', 'footer_copyright', 'guide_subtitle']
    for (var b = 0; b < brandKeys.length; b++) {
      if (typeof map[brandKeys[b]] === 'string' && map[brandKeys[b]].indexOf('Zicola Math') !== -1) {
        map[brandKeys[b]] = map[brandKeys[b]].split('Zicola Math').join('Zicola Math')
      }
    }
    // اسم المستر في النافيبار: **مستر زيكولا** بالعربي — من غير علامة
    // العصاية (|) ومن غير الإنجليزي (طلب المستر: شيل العصاية واكتب بس
    // مستر زيكولا) — أي قيمة مخزنة قديمة بتتصحح على القراءة هنا،
    // والترحيل في ensure-schema بصلحه نهائيًا
    var navSub = map['navbar_subtitle']
    if (typeof navSub === 'string' && navSub !== 'مستر زيكولا' && (navSub.indexOf('خضير') !== -1 || navSub.indexOf('Khadir') !== -1 || navSub.indexOf('Khodair') !== -1 || navSub.indexOf('Khudair') !== -1 || navSub.indexOf('Khodier') !== -1 || navSub.indexOf('El-Kh') !== -1 || navSub.indexOf('Sherif') !== -1 || navSub.indexOf('شريف') !== -1 || navSub.indexOf('Mr') !== -1)) {
      map['navbar_subtitle'] = 'مستر زيكولا'
    }
    // اسم المستر العربي الصحيح للمنصة دي: **مستر زيكولا** (الاسم الرسمي
    // بطلب المستر حرفيًا) — أي قيمة قديمة مخزنة (مستر شريف أو تهجئة غلط
    // 'الخضيري') بتتصحح على القراءة هنا، والترحيل في ensure-schema
    // بصلحه نهائيًا في قاعدة البيانات
    var arabicNameKeys = ['hero_title_line2', 'instructor_name']
    for (var a = 0; a < arabicNameKeys.length; a++) {
      var av = map[arabicNameKeys[a]]
      if (typeof av === 'string' && (av.indexOf('Sherif') !== -1 || av.indexOf('شريف') !== -1 || av.indexOf('الخضيري') !== -1)) {
        map[arabicNameKeys[a]] = 'مستر زيكولا'
      }
    }
    var cfgKeys = Object.keys(map)
    for (var k = 0; k < cfgKeys.length; k++) {
      var v = map[cfgKeys[k]]
      if (typeof v !== 'string') continue
      if (v.indexOf('Mr. Sherif ElSayed') !== -1 || v.indexOf('مستر شريف السيد') !== -1 || v.indexOf('نصائح مستر شريف') !== -1 || v.indexOf('Mr. Wael El-Khadiry') !== -1 || v.indexOf('مستر زيكولا') !== -1) {
        map[cfgKeys[k]] = v.split('Mr. Sherif ElSayed').join('Zicola Math').split('مستر شريف السيد').join('مستر زيكولا').split('نصائح مستر شريف').join('نصائح مستر زيكولا').split('Mr. Wael El-Khadiry').join('Zicola Math').split('مستر زيكولا').join('مستر زيكولا')
      }
    }
    return NextResponse.json(map)
  } catch (error) {
    console.error('Config fetch error:', error)
    // CRITICAL FIX: Return flat DEFAULTS so frontend never crashes
    return NextResponse.json(Object.assign({}, DEFAULTS))
  }
}

export async function PUT(request) {
  try {
    var body = await request.json()
    var keys = Object.keys(body)

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      var value = body[key]
      // Skip non-config keys that might come from error responses
      if (key === 'error' || key === 'defaults') continue
      await safeWrite(function(k, v) {
        return function() {
          return db.siteConfig.upsert({
            where: { key: k },
            update: { value: v, updatedAt: new Date() },
            create: { key: k, value: v },
          })
        }
      }(key, value))
    }

    return NextResponse.json({ message: 'Config updated' })
  } catch (error) {
    console.error('Config update error:', error)
    return NextResponse.json({ error: 'Failed to update config', detail: error.message, code: error.code }, { status: 500 })
  }
}
