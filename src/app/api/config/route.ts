// @ts-nocheck
import { NextResponse } from 'next/server'
import { db, safeWrite } from '@/lib/db'

var DEFAULTS = {
  // === Navbar ===
  navbar_brand: 'The Scholar in Math',
  navbar_subtitle: 'مستر أحمد شعبان',

  // === Hero Section ===
  hero_badge: 'منصة تعليمية متكاملة | Comprehensive Learning Platform',
  /* (و70) هوية The Scholar: السطر الأول «The Scholar» والسطر الثاني
     «by مستر أحمد شعبان» — طلب المستر حرفيًا */
  hero_title_line1: 'The Scholar',
  hero_title_line2: 'by مستر أحمد شعبان',
  /* (و70) صورة الهيرو = مستر طالع من السحابة (الصورة الرسمية الجديدة) */
  instructor_photo: '/images/the-scholar-hero.png',
  /* (و70) صورة النافيبار = صورة المستر الرسمية (كحلي) — منفصلة عن الهيرو */
  navbar_photo: '/images/the-scholar-nav.png',
  /* (و70) فيفيكون المنصة = صورة المستر الرسمية */
  favicon_url: '/images/the-scholar-favicon.png',
  /* (و70) الفيديو التعريفي في أعلى الصفحة الرئيسية (لينك يوتيوب أو ملف مرفوع)
     — فاضي = القسم مش بيظهر خالص */
  intro_video_url: '',
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
  schedule_brand: 'The Scholar in Math',
  schedule_data: '',

  // === Instructor ===
  instructor_name: 'مستر أحمد شعبان',
  instructor_title: 'Mathematics Specialist | معلم الرياضيات المتخصص',
  /* (و70) instructor_photo و navbar_photo و favicon_url متعارفين فوق في
     قسم Hero — ممنوع تكرارهم هنا عشان ما يفضيوش القيم */

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
  tips_subtitle: 'نصائح ذهبية من مستر أحمد شعبان للتفوّق في الرياضيات — Golden advice from The Scholar in Math',
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
  guide_subtitle: 'ست خطوات بسيطة لتبدأ رحلتك التعليمية في The Scholar in Math — Six simple steps to begin your learning journey',
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
  footer_brand: 'The Scholar in Math',
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
    // اسم المنصة الصحيح: The Scholar in Math (من غير s) — لو قاعدة البيانات لسه فيها
    // الاسم القديم من نسخة قديمة بنصلحه على القراءة، والترحيل في ensure-schema
    // بصلحه نهائيًا في قاعدة البيانات
    var brandKeys = ['navbar_brand', 'footer_brand', 'footer_copyright', 'guide_subtitle', 'schedule_brand']
    for (var b = 0; b < brandKeys.length; b++) {
      /* (و70) أي قيمة مخزنة قديمة (Zicola Math / Zicola in Math / Maths Genius)
         بتتصحح فورًا على القراءة إلى The Scholar in Math — والترحيل في
         ensure-schema بصلحها نهائيًا في قاعدة البيانات */
      if (typeof map[brandKeys[b]] === 'string' && (map[brandKeys[b]].indexOf('Zicola') !== -1 || map[brandKeys[b]].indexOf('Math Genius') !== -1 || map[brandKeys[b]].indexOf('Maths Genius') !== -1)) {
        map[brandKeys[b]] = map[brandKeys[b]].split('Zicola in Math').join('The Scholar in Math').split('Zicola Math').join('The Scholar in Math').split('Maths Genius').join('The Scholar in Math').split('Math Genius').join('The Scholar in Math')
      }
    }
    /* (و70) عنوان الهيرو الرسمي: The Scholar + by مستر أحمد شعبان
       — أي قيمة Zicola قديمة بتترجم على القراءة والترحيل يصلحها نهائيًا */
    if (typeof map['hero_title_line1'] === 'string' && map['hero_title_line1'].indexOf('Zicola') !== -1) {
      map['hero_title_line1'] = 'The Scholar'
    }
    /* (و70) صورة الهيرو القديمة (مستر وائل/استضافة خارجية) = صورة السحابة الجديدة */
    if (typeof map['instructor_photo'] === 'string' && (map['instructor_photo'].indexOf('mr-wael') !== -1 || map['instructor_photo'].indexOf('i.imghos.co') !== -1 || map['instructor_photo'] === '')) {
      map['instructor_photo'] = '/images/the-scholar-hero.png'
    }
    /* (و70) صورة النافيبار + الفيفيكون: أي قيمة فاضية أو قديمة = الصور الرسمية الجديدة */
    if (typeof map['navbar_photo'] === 'string' && (map['navbar_photo'].indexOf('mr-wael') !== -1 || map['navbar_photo'] === '')) {
      map['navbar_photo'] = '/images/the-scholar-nav.png'
    }
    if (typeof map['favicon_url'] === 'string' && (map['favicon_url'].indexOf('mr-wael') !== -1 || map['favicon_url'].indexOf('logo.svg') !== -1 || map['favicon_url'] === '')) {
      map['favicon_url'] = '/images/the-scholar-favicon.png'
    }
    // اسم المستر في النافيبار: **مستر أحمد شعبان** بالعربي — من غير علامة
    // العصاية (|) ومن غير الإنجليزي (طلب المستر: شيل العصاية واكتب بس
    // مستر أحمد شعبان) — أي قيمة مخزنة قديمة بتتصحح على القراءة هنا،
    // والترحيل في ensure-schema بصلحه نهائيًا
    var navSub = map['navbar_subtitle']
    if (typeof navSub === 'string' && navSub !== 'مستر أحمد شعبان' && (navSub.indexOf('زيكولا') !== -1 || navSub.indexOf('Zicola') !== -1 || navSub.indexOf('خضير') !== -1 || navSub.indexOf('Khadir') !== -1 || navSub.indexOf('Khodair') !== -1 || navSub.indexOf('Khudair') !== -1 || navSub.indexOf('Khodier') !== -1 || navSub.indexOf('El-Kh') !== -1 || navSub.indexOf('Sherif') !== -1 || navSub.indexOf('شريف') !== -1 || navSub.indexOf('Mr') !== -1)) {
      map['navbar_subtitle'] = 'مستر أحمد شعبان'
    }
    // اسم المستر العربي الصحيح للمنصة دي: **مستر أحمد شعبان** (الاسم الرسمي
    // بطلب المستر حرفيًا) — أي قيمة قديمة مخزنة (مستر شريف أو تهجئة غلط
    // 'الخضيري') بتتصحح على القراءة هنا، والترحيل في ensure-schema
    // بصلحه نهائيًا في قاعدة البيانات
    var arabicNameKeys = ['hero_title_line2', 'instructor_name']
    for (var a = 0; a < arabicNameKeys.length; a++) {
      var av = map[arabicNameKeys[a]]
      /* (و70) السطر التاني في الهيرو بقى «by مستر أحمد شعبان» رسميًا —
         أي اسم قديم (زيكولا/شريف/الخضيري) بيترجم هنا والترحيل يصلحه نهائيًا */
      if (typeof av === 'string' && av.indexOf('Zicola') === -1 && (av.indexOf('Sherif') !== -1 || av.indexOf('شريف') !== -1 || av.indexOf('الخضيري') !== -1)) {
        map[arabicNameKeys[a]] = 'مستر أحمد شعبان'
      }
      if (typeof av === 'string' && (av.indexOf('زيكولا') !== -1 || av.indexOf('Zicola') !== -1)) {
        map[arabicNameKeys[a]] = arabicNameKeys[a] === 'hero_title_line2' ? 'by مستر أحمد شعبان' : 'مستر أحمد شعبان'
      }
    }
    var cfgKeys = Object.keys(map)
    for (var k = 0; k < cfgKeys.length; k++) {
      var v = map[cfgKeys[k]]
      if (typeof v !== 'string') continue
      if (v.indexOf('Mr. Sherif ElSayed') !== -1 || v.indexOf('مستر شريف السيد') !== -1 || v.indexOf('نصائح مستر أحمد شعبان') !== -1 || v.indexOf('Mr. Wael El-Khadiry') !== -1 || v.indexOf('مستر أحمد شعبان') !== -1) {
        map[cfgKeys[k]] = v.split('Mr. Sherif ElSayed').join('The Scholar in Math').split('مستر شريف السيد').join('مستر أحمد شعبان').split('نصائح مستر أحمد شعبان').join('نصائح مستر أحمد شعبان').split('Mr. Wael El-Khadiry').join('The Scholar in Math').split('مستر أحمد شعبان').join('مستر أحمد شعبان')
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
