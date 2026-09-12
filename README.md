# منهو؟ — WhoIsThis V2

نسخة V2 تحافظ على بيانات Supabase الحالية وتضيف إدارة كاملة للدليل والتقييمات والبلاغات، وفرزًا وتصفية للطلاب، ومعيار التعامل، وحماية أفضل من التكرار والسبام.

## الترقية من النسخة الحالية

1. **لا تحذفي أي جدول ولا تعيدي تشغيل `schema.sql`.** افتحي Supabase > SQL Editor وشغّلي ملف `migration_v2.sql` مرة واحدة فقط.
2. بعد نجاح الـmigration، ارفعي ملفات V2 إلى **نفس GitHub repository** واستبدلي الملفات القديمة. يجب أن يبقى مجلد `netlify/functions` كما هو في البنية.
3. لا تغيّري Environment Variables في Netlify. تبقى القيم الحالية نفسها: `STUDENT_ACCESS_PASSWORD`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. بعد الـCommit إلى `main` سيعمل Netlify Deploy تلقائيًا.
5. اختبري: دخول طالب > فتح عضو > إرسال تقييم > إرسال بلاغ > لوحة الإدارة > تعديل/إخفاء عضو > إخفاء/إعادة نشر تقييم > إغلاق بلاغ.

## ما الجديد في V2

- عرض أعضاء هيئة التدريس داخل لوحة الإدارة مع البحث والتصفية.
- تعديل الاسم والقسم.
- إخفاء/إظهار عضو بدون خسارة تقييماته.
- حذف العضو فقط إذا لم يكن لديه تقييمات.
- منع التكرار باسم + قسم على مستوى قاعدة البيانات.
- بحث وفرز وتصفية في واجهة الطلاب.
- معيار «التعامل مع الطلاب» للتقييمات الجديدة؛ التقييمات القديمة تبقى سليمة وتظهر `—` لهذا المعيار.
- عداد أحرف للتعليق وإقرار بقواعد المجتمع.
- إبلاغ عبر نافذة مخصصة بدل prompt.
- إدارة البلاغات: مفتوح/مغلق، وإخفاء التقييم من البلاغ مباشرة.
- إدارة التقييمات: منشور/مخفي وحذف نهائي.
- حماية server-side من إرسال عدد كبير من التقييمات/البلاغات بسرعة من الجهاز نفسه.
- Content Security Policy ورؤوس حماية إضافية.
- رسائل نجاح/خطأ أوضح وتصميم Responsive محسّن.

## ملاحظات أمان

- لا تضعي Secret/Service Role Key في GitHub أبدًا.
- عدم وجود حسابات يعني أن منع التكرار هو تقليل للسبام وليس إثبات هوية قويًا.
- «إخفاء» عضو هو الخيار الأفضل إذا كان لديه تقييمات؛ الحذف النهائي ممنوع تلقائيًا حين توجد تقييمات.

## V2.1 — logo + initial KAU Medicine faculty directory

- Added `assets/manho-logo.jpg` as the site logo on login, student, and admin pages, and as the favicon.
- Added `seed_faculty_2026.sql` to preload the faculty directory from `KAU_Medicine_Jeddah_Faculty_Directory(1).xlsx`.
- The spreadsheet contains 137 rows. One obvious duplicate person (Ashraf Youssef Nasr listed once as Dr and once as Prof) is consolidated, so the seed contains 136 entries.
- The seed is safe to rerun because it uses `ON CONFLICT DO NOTHING`; it does not delete existing professors, reviews, or reports.

### Apply the faculty list

1. Open Supabase → SQL Editor → New query.
2. Paste all of `seed_faculty_2026.sql`.
3. Run it once.
4. Refresh the student directory and admin dashboard.

If you already created test faculty entries manually, they remain untouched. You can remove/hide those from the admin dashboard if they duplicate imported people under a different spelling/language.
