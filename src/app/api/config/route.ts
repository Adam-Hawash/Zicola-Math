// @ts-nocheck
import { NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'

var DEFAULTS = {
  // === Navbar ===
  /* (و72) الهوية الجديدة للنافبار: Zicola In Math — في الاتجاهين */
  navbar_brand: 'Zicola In Math',
  navbar_subtitle: 'مستر أحمد شعبان',
  /* (و71) النسخ الإنجليزية لكل نصوص الأدمن — الطالب لما يحول الإنجليزي
     يشوفها، والمستر يعدلها من لوحة التحكم (كل خانة عربي تحتها خانة إنجليزي) */
  navbar_brand_en: 'Zicola In Math',
  /* (و73) التهجئة الرسمية: Mister كاملة (Mr) مش الاختصار الغلط — وShaban من غير c (و72) */
  navbar_subtitle_en: 'Mr. Ahmed Shaban',

  // === Hero Section ===
  hero_badge: 'منصة تعليمية متكاملة | Comprehensive Learning Platform',
  hero_badge_en: 'Comprehensive Learning Platform',
  /* (و73) هوية الهيرو الجديدة زي الصورة المرجعية: سطر أبيض ضخم «مستر الماث»
     وسطر أزرق سماوي «م/أحمد شعبان» — بتفضل قابلة للتغيير من لوحة الأدمن */
  hero_title_line1: 'مستر الماث',
  hero_title_line1_en: 'Mr. Math',
  hero_title_line2: 'م/أحمد شعبان',
  /* (و72) التهجئة الرسمية: Shaban (من غير c) — (و73) الاسم لوحده من غير by */
  hero_title_line2_en: 'Mr. Ahmed Shaban',
  /* (و70) صورة الهيرو = مستر طالع من السحابة — الصورة الرسمية **الكاملة** (و71)
     من غير أي قص: المستر طالع من سحابة وإسمه تحتها (the-scholar-full) */
  instructor_photo: '/images/the-scholar-full.png',
  /* (و70) صورة النافيبار = صورة المستر الرسمية (كحلي) — منفصلة عن الهيرو */
  navbar_photo: '/images/the-scholar-nav.png',
  /* (و70) فيفيكون المنصة = صورة المستر الرسمية */
  favicon_url: '/images/the-scholar-favicon.png',
  /* (و70) الفيديو التعريفي في أعلى الصفحة الرئيسية (لينك يوتيوب أو ملف مرفوع)
     — فاضي = القسم مش بيظهر خالص */
  intro_video_url: '',
  /* (و73-B2) نص زرار CTA الأزرق في الهيرو — قابل للتغيير من لوحة الأدمن
     (عربي + إنجليزي زي باقي نصوص الهيرو) */
  hero_cta_text: 'اعمل حسابك',
  hero_cta_text_en: 'Create Account',
  hero_subtitle: 'يبقى معايا الماث مش حفظ قوانين وخطوات بس — هيتعلم إزاي يفكر ويرتب ويحل بثقة. هنثبت له إن الماث لغة منطقية سهلة وممتعة، وهيبقى دايمًا مستعد لأي امتحان.',
  hero_subtitle_en: 'We make math simple and fun! Algebra, Geometry, Formulas, Cheat Sheets — weekly homework, regular exams, and continuous tracking of your academic progress.',
  hero_stat1_value: '8+',
  hero_stat1_label: 'صفوف دراسية',
  hero_stat1_label_en: 'Grade Levels',
  hero_stat2_value: '100+',
  hero_stat2_label: 'دروس فيديو',
  hero_stat2_label_en: 'Video Lessons',
  hero_stat3_value: '24/7',
  hero_stat3_label: 'متابعة',
  hero_stat3_label_en: 'Progress Tracking',
  hero_developer_url: 'https://prime-developer-portfolio-11.vercel.app',
  hero_developer_label: 'Hero Developer',
  /* (10-b) توقيع المطور الرسمي بالظبط «Developed by Adam Hawash» — Adam من غير h
     بطلب صاحب المنصة (الترميم القديمة و78 كانت بترجّعه Adham — اتعكس تحت) */
  footer_made_by_label: 'Developed by Adam Hawash',
  prime_developer_url: 'https://prime-developer-portfolio-11.vercel.app',

  // === Schedule Page ===
  schedule_title: 'مواعيد السنتر',
  schedule_title_en: 'Center Schedule',
  schedule_subtitle: 'جدول مواعيد الحصص الأسبوعية لكل الصفوف الدراسية — اختر اليوم المناسب لك وتابع موعد حصتك',
  schedule_subtitle_en: 'Weekly class schedule for all grades — pick the day that suits you and catch your class on time',
  schedule_badge: 'جدول الحصص الأسبوعي',
  schedule_badge_en: 'Weekly Class Schedule',
  schedule_footer_note: 'جميع المواعيد بتوقيت القاهرة. لو عندك أي استفسار عن موعد حصتك تواصل معنا عبر واتساب.',
  schedule_brand: 'Zicola In Math',
  schedule_data: '',

  // === Instructor ===
  instructor_name: 'مستر أحمد شعبان',
  instructor_name_en: 'Mr. Ahmed Shaban',
  instructor_title: 'Mathematics Specialist | معلم الرياضيات المتخصص',
  instructor_title_en: 'Mathematics Specialist',
  /* (و70) instructor_photo و navbar_photo و favicon_url متعارفين فوق في
     قسم Hero — ممنوع تكرارهم هنا عشان ما يفضيوش القيم */

  // === Features Section ===
  features_title: 'لماذا تختارنا؟',
  features_title_en: 'Why Choose Us?',
  features_subtitle: 'نقدّم لك تجربة تعليمية فريدة تجمع بين الشرح المبسط والتطبيق العملي في Algebra, Geometry, and More',
  features_subtitle_en: 'A unique learning experience combining simple explanations and hands-on practice across Algebra, Geometry, and More',
  feature1_title: 'شرح مبسط',
  feature1_title_en: 'Simplified Explanations',
  feature1_desc: 'شرح واضح ومبسط لكل درس رياضيات بطريقة تساعد الطالب على الفهم السريع والاستيعاب العميق لمفاهيم Algebra و Geometry الأساسية.',
  feature1_desc_en: 'Clear, simplified explanation for every math lesson that helps students understand quickly and master the core Algebra and Geometry concepts.',
  feature2_title: 'فهم العمليات',
  feature2_title_en: 'Deep Understanding',
  feature2_desc: 'نركّز على فهم العمليات الرياضية من الجذور وليس الحفظ فقط، مما يبني قدرة حقيقية على حل أي مسألة في Formulas و Problem Solving.',
  feature2_desc_en: 'We focus on understanding math from the roots, not memorization — building real problem-solving power for Formulas and Problem Solving.',
  feature3_title: 'حل المسائل',
  feature3_title_en: 'Step-by-Step Solutions',
  feature3_desc: 'حل خطوة بخطوة للمسائل المعقدة مع Cheat Sheets وملخصات بصرية تسهّل الفهم والتذكّر.',
  feature3_desc_en: 'Step-by-step solutions for complex problems, with Cheat Sheets and visual summaries that make understanding and recall easier.',
  feature4_title: 'تحضير وامتحانات',
  feature4_title_en: 'Reviews & Exams',
  feature4_desc: 'تحضير شامل ومراجعات دورية واختبارات أسبوعية لضمان التفوّق والاستعداد الكامل للامتحانات النهائية.',
  feature4_desc_en: 'Comprehensive preparation, regular reviews, and weekly exams to guarantee excellence and full readiness for final exams.',

  // === Grades Section ===
  grades_title: 'السنوات الدراسية',
  grades_title_en: 'Academic Years',
  grades_subtitle: 'اختر صفك الدراسي للوصول إلى المحتوى التعليمي المخصص لك',
  grades_subtitle_en: 'Choose your grade to reach the learning content made for you',

  // === Tips Section ===
  tips_badge: 'نصائح للتفوّق',
  tips_badge_en: 'Tips for Excellence',
  tips_title: 'نصائح المستر',
  tips_title_en: "Teacher's Tips",
  tips_subtitle: 'نصائح ذهبية من مستر أحمد شعبان للتفوّق في الرياضيات',
  tips_subtitle_en: 'Golden advice from Mr. Ahmed Shaban to excel in mathematics',
  tips_card1_title: 'حدد وقت يومي للمراجعة',
  tips_card1_title_en: 'Set Daily Review Time',
  tips_card1_desc: 'خصص 20-30 دقيقة كل يوم لمراجعة ما تعلمته. الاستمرارية هي مفتاح التفوّق في الرياضيات.',
  tips_card1_desc_en: 'Dedicate 20-30 minutes every day to review what you learned. Consistency is the key to excellence in mathematics.',
  tips_card2_title: 'ركز على الفهم وليس الحفظ',
  tips_card2_title_en: 'Focus on Understanding, Not Memorization',
  tips_card2_desc: 'حاول فهم لماذا وليس كيف فقط. الفهم العميق يبقي المعلومة لفترة أطول ويساعدك في حل مسائل جديدة.',
  tips_card2_desc_en: 'Try to understand why, not just how. Deep understanding keeps knowledge longer and helps you solve new problems.',
  tips_card3_title: 'حل مسائل إضافية كل يوم',
  tips_card3_title_en: 'Solve Extra Problems Daily',
  tips_card3_desc: 'لا تكتفي بالواجبات فقط. حل مسائل إضافية من الكتاب المدرسي لتعزيز مهاراتك.',
  tips_card3_desc_en: 'Do not stop at homework. Solve extra problems from the textbook to strengthen your skills.',
  tips_card4_title: 'لا تتردد في السؤال',
  tips_card4_title_en: 'Never Hesitate to Ask',
  tips_card4_desc: 'إذا لم تفهم شيئاً اسأل فوراً. السؤال الجيد هو بداية الفهم العميق.',
  tips_card4_desc_en: 'If you do not understand something, ask immediately. A good question is the start of deep understanding.',

  // === Guide Section ===
  guide_badge: 'دليلك التعليمي',
  guide_badge_en: 'Learning Guide',
  guide_title: 'كيف تستخدم المنصة؟',
  guide_title_en: 'How to Use the Platform',
  guide_subtitle: 'ست خطوات بسيطة لتبدأ رحلتك التعليمية في Zicola In Math',
  guide_subtitle_en: 'Six simple steps to begin your learning journey with Zicola In Math',
  guide_card1_title: 'تسجيل حسابك',
  guide_card1_title_en: 'Register',
  guide_card1_desc: 'أنشئ حسابك في المنصة بسرعة وسهولة. اختر صفّك الدراسي وابدأ رحلتك التعليمية فوراً.',
  guide_card1_desc_en: 'Create your account quickly and easily. Pick your grade and start your learning journey right away.',
  guide_card2_title: 'مشاهدة الدروس',
  guide_card2_title_en: 'Watch Lessons',
  guide_card2_desc: 'تابع شروحات مبسّطة ومتسلسلة لكل درس رياضيات بأسلوب تفاعلي يجعل الفهم أسهل.',
  guide_card2_desc_en: 'Follow simplified, sequential video explanations for every lesson in an interactive style that makes understanding easier.',
  guide_card3_title: 'حل الواجبات',
  guide_card3_title_en: 'Homework',
  guide_card3_desc: 'أكمل واجباتك الأسبوعية وحلّ التمارين لتثبيت المعلومات واختبار فهمك.',
  guide_card3_desc_en: 'Complete your weekly homework and exercises to lock in knowledge and test your understanding.',
  guide_card4_title: 'أداء الامتحانات',
  guide_card4_title_en: 'Take Exams',
  guide_card4_desc: 'شارك في الامتحانات الدورية لمتابعة مستوايك والاستعداد للامتحانات النهائية.',
  guide_card4_desc_en: 'Take the periodic exams to track your level and prepare for the final exams.',
  guide_card5_title: 'بطاقات تعليمية',
  guide_card5_title_en: 'Flashcards',
  guide_card5_desc: 'استخدم البطاقات التعليمية لمراجعة المصطلحات والقوانين الرياضية بشكل سريع.',
  guide_card5_desc_en: 'Use flashcards to review math terms and formulas quickly.',
  guide_card6_title: 'تحديات ومسابقات',
  guide_card6_title_en: 'Challenges',
  guide_card6_desc: 'تنافس مع زملائك في تحديات رياضية ممتعة واربح مراكز متقدمة.',
  guide_card6_desc_en: 'Compete with your classmates in fun math challenges and climb the leaderboard.',

  // === Gallery ===
  gallery_title: 'صور طلابي الأعزاء',
  gallery_title_en: 'My Beloved Students',
  gallery_subtitle: 'لحظات مميزة من رحلتنا التعليمية',
  gallery_subtitle_en: 'Special moments from our educational journey',

  // === Social Links ===
  social_facebook: '',
  social_whatsapp_channel: '',
  social_instagram: '',
  social_youtube: '',

  // === WhatsApp Button ===
  whatsapp_number: '201000000000',

  // === Footer ===
  footer_brand: 'Zicola In Math',
  footer_brand_en: 'Zicola In Math',
  footer_copyright: 'جميع الحقوق محفوظة لـ أدهم حواش',
  footer_copyright_en: 'All rights reserved to Adam Hawash',

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
    /* (و80) إصلاح جذري لعلة «عدّل حاجة في الأدمن وبعد الـ reload بترجع زي ما كانت»:
     * القراءة هنا بقت **زي ما هي من قاعدة البيانات من غير أي تعديل أو تصحيح مفروض** —
     * شيلنا كل طبقات الشفاء الذاتي وقت القراءة: ترميمات البراند (Zicola/Mr/Mister)،
     * إجبار أسماء المستر والصور والفيفيكون، تصحيح Adham→Adam، والـ write-through
     * اللي كان بيكتب في قاعدة البيانات من جوه GET نفسه. كل التصحيحات القديمة
     * اتنفذت فعلًا على قاعدة الإنتاج في ترحيلات ensure-schema من النشرات السابقة
     * فمش محتاجين نكررها هنا — التكرار على القراءة كان بيلغي أي تعديل يعمله
     * الأدمن فورًا فيظهرله إن «التغييرات بترجع» رغم إنها متخزنة فعلًا.
     * أي تعديل من الأدمن دلوقتي بيتخزن وبيترجع زي ما هو. */
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
