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
  navbar_subtitle_en: 'Mr. Ahmed Shaaban',

  // === Hero Section ===
  hero_badge: 'منصة تعليمية متكاملة | Comprehensive Learning Platform',
  hero_badge_en: 'Comprehensive Learning Platform',
  /* (و70) هوية The Scholar: السطر الأول «The Scholar» والسطر الثاني
     «by مستر أحمد شعبان» — طلب المستر حرفيًا */
  hero_title_line1: 'The Scholar',
  hero_title_line2: 'by مستر أحمد شعبان',
  /* (و72) التهجئة الرسمية الجديدة: Shaban (من غير c) */
  hero_title_line2_en: 'by Mr. Ahmed Shaban',
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
  hero_subtitle: 'نبسّط لك الرياضيات ونجعلها سهلة وممتعة! Algebra, Geometry, Formulas, Cheat Sheets — واجبات أسبوعية، امتحانات منتظمة، ومتابعة مستمرة لتقدّمك الأكاديمي.',
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
  schedule_brand: 'The Scholar in Math',
  schedule_data: '',

  // === Instructor ===
  instructor_name: 'مستر أحمد شعبان',
  instructor_name_en: 'Mr. Ahmed Shaaban',
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
  tips_subtitle_en: 'Golden advice from Mr. Ahmed Shaaban to excel in mathematics',
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
  guide_subtitle: 'ست خطوات بسيطة لتبدأ رحلتك التعليمية في The Scholar in Math',
  guide_subtitle_en: 'Six simple steps to begin your learning journey with The Scholar in Math',
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
  footer_brand: 'The Scholar in Math',
  footer_brand_en: 'The Scholar in Math',
  footer_copyright: 'جميع الحقوق محفوظة لـ أدهم حواش',
  footer_copyright_en: 'All rights reserved to Adham Hawash',

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
    /* (و72) القيم الخام المخزنة قبل ترميمات البراند — بنحتاجها عشان
       نطبّق ترميم الهوية الجديدة في آخر الخطوات (تحت) من غير ما
       الترميمات القديمة (اللي بتنقل أي Zicola إلى The Scholar) تلغّيها */
    var rawNavbarBrand = typeof map['navbar_brand'] === 'string' ? map['navbar_brand'] : ''
    var rawNavbarBrandEn = typeof map['navbar_brand_en'] === 'string' ? map['navbar_brand_en'] : ''
    var rawHeroTitle2En = typeof map['hero_title_line2_en'] === 'string' ? map['hero_title_line2_en'] : ''
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
      map['instructor_photo'] = '/images/the-scholar-full.png'
    }
    /* (و71) صورة الهيرو القديمة (the-scholar-hero — كانت مقتطعة من مرجع تاني
       فيها شخص غلط) = الصورة الرسمية الكاملة للسيد المستر من غير قص */
    if (typeof map['instructor_photo'] === 'string' && (map['instructor_photo'].indexOf('the-scholar-hero') !== -1 || map['instructor_photo'].indexOf('mostafa') !== -1 || map['instructor_photo'].indexOf('hossam') !== -1)) {
      map['instructor_photo'] = '/images/the-scholar-full.png'
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
      /* (و71) قاعدة بيانات إنتاج قديمة بتعرض «مهندس الماث م/مصطفى حسام» —
         بنرجّع هوية The Scholar الرسمية فورًا على القراءة (والترحيل يصلح نهائيًا) */
      if (typeof av === 'string' && (av.indexOf('مهندس') !== -1 || av.indexOf('مصطفى') !== -1 || av.indexOf('حسام') !== -1 || av.indexOf('Mostafa') !== -1 || av.indexOf('Hossam') !== -1 || av.indexOf('Math Engineer') !== -1)) {
        map[arabicNameKeys[a]] = arabicNameKeys[a] === 'hero_title_line2' ? 'by مستر أحمد شعبان' : 'مستر أحمد شعبان'
      }
    }
    /* (و71) عنوان الهيرو الأول «The Scholar» — أي اسم قديم تاني بيترجم فورًا */
    if (typeof map['hero_title_line1'] === 'string' && (map['hero_title_line1'].indexOf('مهندس') !== -1 || map['hero_title_line1'].indexOf('مصطفى') !== -1 || map['hero_title_line1'].indexOf('حسام') !== -1 || map['hero_title_line1'].indexOf('Mostafa') !== -1 || map['hero_title_line1'].indexOf('Hossam') !== -1 || map['hero_title_line1'].indexOf('Math Engineer') !== -1)) {
      map['hero_title_line1'] = 'The Scholar'
    }
    /* (و71) اسم النافيبار/الفوتر — نفس الحماية للإنتاج */
    if (typeof map['navbar_brand'] === 'string' && (map['navbar_brand'].indexOf('مهندس الماث') !== -1 || map['navbar_brand'].indexOf('مصطفى') !== -1 || map['navbar_brand'].indexOf('حسام') !== -1 || map['navbar_brand'].indexOf('Mostafa') !== -1 || map['navbar_brand'].indexOf('Hossam') !== -1 || map['navbar_brand'].indexOf('Math Engineer') !== -1)) {
      map['navbar_brand'] = 'The Scholar in Math'
    }
    var cfgKeys = Object.keys(map)
    for (var k = 0; k < cfgKeys.length; k++) {
      var v = map[cfgKeys[k]]
      if (typeof v !== 'string') continue
      if (v.indexOf('Mr. Sherif ElSayed') !== -1 || v.indexOf('مستر شريف السيد') !== -1 || v.indexOf('نصائح مستر أحمد شعبان') !== -1 || v.indexOf('Mr. Wael El-Khadiry') !== -1 || v.indexOf('مستر أحمد شعبان') !== -1) {
        map[cfgKeys[k]] = v.split('Mr. Sherif ElSayed').join('The Scholar in Math').split('مستر شريف السيد').join('مستر أحمد شعبان').split('نصائح مستر أحمد شعبان').join('نصائح مستر أحمد شعبان').split('Mr. Wael El-Khadiry').join('The Scholar in Math').split('مستر أحمد شعبان').join('مستر أحمد شعبان')
      }
    }
    /* (و72) الهوية الجديدة للنافبار: «Zicola In Math» + تهجئة الاسم Shaban —
       آخر خطوة بعد كل ترميمات The Scholar القديمة (اللي كانت بتترجم أي
       Zicola إلى The Scholar في brandKeys فوق):
       - أي قيمة مخزنة فيها Zicola In Math بترجع زي ما هي (الترميم القديم كان بيغيرها)
       - أي قيمة مخزنة = The Scholar in Math بالظبط بتتحول Zicola In Math
         وبتتكتب نهائيًا في قاعدة البيانات (write-through)
       - hero_title_line2_en القديمة (Shaaban) بتتهجأ Shaban بنفس النمط */
    var brandFixups: string[][] = []
    if (rawNavbarBrand.indexOf('Zicola In Math') !== -1) {
      map['navbar_brand'] = 'Zicola In Math'
    } else if (rawNavbarBrand === 'The Scholar in Math') {
      map['navbar_brand'] = 'Zicola In Math'
      brandFixups.push(['navbar_brand', 'Zicola In Math'])
    }
    if (rawNavbarBrandEn.indexOf('Zicola In Math') !== -1) {
      map['navbar_brand_en'] = 'Zicola In Math'
    } else if (rawNavbarBrandEn === 'The Scholar in Math') {
      map['navbar_brand_en'] = 'Zicola In Math'
      brandFixups.push(['navbar_brand_en', 'Zicola In Math'])
    }
    if (rawHeroTitle2En === 'by Mr. Ahmed Shaaban') {
      map['hero_title_line2_en'] = 'by Mr. Ahmed Shaban'
      brandFixups.push(['hero_title_line2_en', 'by Mr. Ahmed Shaban'])
    }
    for (var f = 0; f < brandFixups.length; f++) {
      (function (fk: string, fv: string) {
        db.siteConfig.upsert({
          where: { key: fk },
          update: { value: fv, updatedAt: new Date() },
          create: { key: fk, value: fv },
        }).catch(function () {})
      })(brandFixups[f][0], brandFixups[f][1])
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
