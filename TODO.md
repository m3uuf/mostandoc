# TODO — Mustanadak (مستندك)

## باقات تصفح المستخدم (تقرير 2026-03-16)

### أخطاء حرجة (Critical)
- [ ] صفحة `/register` تعطي 404 — تظهر "Page Not Found" مع رسالة تطويرية بالإنجليزي. أي رابط خارجي يوجه لـ `/register` مكسور
- [ ] تناقض الأسعار بين اللاندنج والتطبيق — اللاندنج: مجاني (0) / احترافي (99 ر.س) / مؤسسي. التطبيق: المبتدئ (29 ر.س) / المحترف (150 ر.س). أسماء وأسعار ومميزات مختلفة تماماً
- [ ] صفحة 404 تعرض نص تطويري — "Did you forget to add the page to the router?" المفروض رسالة عربية

### أخطاء متوسطة (Medium)
- [ ] عملاء بأسماء = إيميلات أو "Unknown" — بيانات مهاجرة من Bubble بدون تنظيف
- [ ] أعمدة "الشركة" و"الجوال" فاضية بالكامل في جدول العملاء
- [ ] الداشبورد يعرض "0" لكل شي (فواتير/عقود/مشاريع) ماعدا العملاء (75)

### أخطاء من الجولة الثانية (تقرير تكميلي 2026-03-16)

#### متوسطة (Medium)
- [ ] قالب العقد يعرض HTML خام — عند اختيار "عقد تقديم خدمات" يظهر كود `<h1>`, `<table>`, `<strong>` بدل نص منسق في textarea المحتوى
- [ ] placeholder التاريخ نص مشوه — "موي/رهش/ةنس" يظهر في حقول التاريخ (الفواتير، العقود، المشاريع) بسبب عكس RTL لـ yyyy/mm/dd
- [ ] تفاصيل العميل ناقصة — النافذة المنبثقة تعرض فقط الاسم والإيميل والحالة وعدد المستندات، بدون جوال أو شركة أو عنوان أو ملاحظات

### أخطاء من الجولة الثالثة (تقرير تكميلي 2026-03-16)

#### حرجة (Critical)
- [ ] لا توجد رسالة خطأ عند فشل تسجيل الدخول — الـ API يرجع 401 لكن الـ UI ما يعرض أي رسالة. المستخدم يضغط الزر ولا يحصل شي

#### متوسطة (Medium)
- [ ] أنيميشن اللاندنج مكسورة — أقسام "كيف يعمل" (فواتير، مستندات، عقود) تظهر بألوان شبه شفافة عند التحميل الأول ولا تُقرأ إلا بعد scrollIntoView
- [ ] رابط "كيف يعمل" في الهيدر لا يعمل بشكل صحيح — يوجه لقسم لكن المحتوى يكون غير مرئي بسبب الأنيميشن

#### تحسينية (Low)
- [ ] الفوتر ناقص — ما فيه سياسة خصوصية أو شروط استخدام أو سوشل ميديا
- [ ] صفحة الإعدادات بسيطة — ما فيه تغيير كلمة المرور أو حذف الحساب
- [ ] رابط اللوجو في هيدر اللاندنج يودي لـ `#` وما يسوي شي
- [ ] صفحة الإشعارات فاضية بدون أي توجيه للمستخدم
- [ ] صفحة "نسيت كلمة المرور" تشتغل ✅ لكن ما تم اختبار استلام الإيميل فعلياً

---

## أولوية عالية (High Priority)

### الأمان (Security)
- [x] إضافة security headers middleware (helmet: HSTS, X-Frame-Options, X-Content-Type-Options)
- [x] إضافة rate limiting على `/api/auth/resend-verification` و `/api/auth/verify-email` و `/api/auth/forgot-password`
- [x] إضافة HTML/XSS sanitization على المحتوى اللي يدخله المستخدم (xss library على document signing)
- [x] إصلاح IPv6 rate-limit validation error
- [ ] تحسين SameSite cookie من `lax` إلى `strict` للعمليات الحساسة
- [ ] التحقق من file type/size validation في جميع endpoints الرفع

### Type Safety
- [x] إزالة `as any` type casting من `server/routes.ts` (session, passport user, Anthropic SDK)
- [x] استبدال `(req.session as any)?.userId` بـ typed session interface
- [x] استبدال `Record<string, any>` بـ `Record<string, unknown>` في index.ts و routes.ts
- [ ] إزالة `as any` المتبقية في `server/storage.ts` و `server/migration.ts`

## أولوية متوسطة (Medium Priority)

### تقسيم الملفات الكبيرة (Code Splitting)
- [ ] تقسيم `server/routes.ts` (2,364 سطر) إلى ملفات حسب الـ resource:
  - `routes/auth.ts`
  - `routes/profiles.ts`
  - `routes/clients.ts`
  - `routes/invoices.ts`
  - `routes/projects.ts`
  - `routes/documents.ts`
  - `routes/admin.ts`
  - `routes/subscriptions.ts`
- [ ] تقسيم `server/storage.ts` (1,275 سطر) إلى modules حسب الـ domain
- [ ] تقسيم `client/src/pages/text-document-editor.tsx` (956 سطر) إلى components أصغر

### الاختبارات (Testing)
- [ ] إعداد test framework (Vitest)
- [ ] كتابة unit tests للـ storage layer
- [ ] كتابة integration tests للـ API endpoints الأساسية (auth, CRUD)
- [ ] كتابة E2E tests للـ flows الرئيسية (تسجيل، فاتورة، عقد)

### تنظيف الكود (Code Cleanup)
- [ ] إزالة أو استبدال `console.log` بـ structured logging (10+ ملفات)
- [ ] إزالة Replit integrations غير المستخدمة (`server/replit_integrations/`)
- [ ] إزالة `memorystore` من dependencies (يُستخدم `connect-pg-simple` بدلاً منه)
- [ ] توحيد أنماط error handling (بعضها `error` وبعضها `err`)

### الأداء (Performance)
- [ ] إضافة lazy loading لصفحات الـ admin
- [ ] تحسين caching للـ public profiles
- [ ] مراجعة N+1 query patterns في storage layer

## أولوية منخفضة (Low Priority)

### ميزات غير مكتملة
- [ ] إكمال Apple Sign-In (الـ backend موجود، الـ UI معطل)
- [ ] نقل أسعار الباقات من hardcoded في routes.ts إلى قاعدة البيانات
- [x] نقل email templates من routes.ts إلى ملفات منفصلة (server/email.ts)

### البنية التحتية (Infrastructure)
- [ ] إعداد CI/CD pipeline (GitHub Actions)
- [ ] إضافة ESLint + Prettier configuration
- [ ] إعداد centralized logging system
- [ ] إضافة monitoring/alerting (error tracking)

### تحسينات عامة
- [ ] إضافة soft deletes بدل hard deletes
- [ ] توثيق API endpoints (Swagger/OpenAPI)
- [ ] إضافة database migration versioning مع Drizzle
- [ ] تنظيف legacy config files (`.replit`, `Procfile`) أو توثيقها بوضوح
