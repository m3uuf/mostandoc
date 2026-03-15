# TODO — Mustanadak (مستندك)

## باقات تصفح المستخدم (تقرير 2026-03-16)

### أخطاء حرجة (Critical)
- [x] صفحة `/register` تعطي 404 — ✅ أضفنا redirect من `/register` → `/auth` في App.tsx
- [x] تناقض الأسعار بين اللاندنج والتطبيق — ✅ تم توحيدها سابقاً في commit dac6d03 (مجاني 0 / المبتدئ 29 / المحترف من 100)
- [x] صفحة 404 تعرض نص تطويري — ✅ تم تعريب الصفحة بالكامل مع رابط العودة للرئيسية

### أخطاء متوسطة (Medium)
- [ ] عملاء بأسماء = إيميلات أو "Unknown" — بيانات مهاجرة من Bubble، تحتاج تنظيف يدوي في قاعدة البيانات
- [ ] أعمدة "الشركة" و"الجوال" فاضية بالكامل في جدول العملاء — بيانات Bubble لم تتضمن هذه الحقول
- [x] الداشبورد يعرض "0" لكل شي (فواتير/عقود/مشاريع) — ✅ تم تغيير الإحصائيات لعرض المجموع الكلي بدل الحالات المحددة فقط

### أخطاء من الجولة الثانية (تقرير تكميلي 2026-03-16)

#### متوسطة (Medium)
- [x] قالب العقد يعرض HTML خام — ✅ القالب يُحول لنص عادي (strip HTML) عند تطبيقه على الـ textarea
- [x] placeholder التاريخ نص مشوه — ✅ أضفنا `dir="ltr"` لكل حقول التاريخ (العقود، الفواتير، المشاريع)
- [x] تفاصيل العميل ناقصة — ✅ الحقول تظهر دائماً (بريد، جوال، شركة، حالة) + قسم الملاحظات

### أخطاء من الجولة الثالثة (تقرير تكميلي 2026-03-16)

#### حرجة (Critical)
- [x] لا توجد رسالة خطأ عند فشل تسجيل الدخول — ✅ تم إصلاح mutations لاستخدام fetch مباشر بدل apiRequest لعرض رسائل الخطأ العربية

#### متوسطة (Medium)
- [x] أنيميشن اللاندنج مكسورة — ✅ تم تغيير الأنيميشن من keyframes لـ CSS transitions مع IntersectionObserver
- [x] رابط "كيف يعمل" في الهيدر لا يعمل بشكل صحيح — ✅ المحتوى يظهر بشكل صحيح الحين مع الأنيميشن الجديدة

#### تحسينية (Low)
- [x] الفوتر ناقص — ✅ أضفنا روابط سياسة الخصوصية وشروط الاستخدام
- [x] صفحة الإعدادات بسيطة — ✅ أضفنا تغيير كلمة المرور (endpoint + UI)
- [x] رابط اللوجو في هيدر اللاندنج يودي لـ `#` وما يسوي شي — ✅ الرابط يشير لـ `/` (الرئيسية) بالفعل، تم التحقق
- [x] صفحة الإشعارات فاضية بدون أي توجيه للمستخدم — ✅ أضفنا empty state مع أيقونة ونص توجيهي
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
