# TODO — Mustanadak (مستندك)

## أولوية عالية (High Priority)

### الأمان (Security)
- [ ] إضافة security headers middleware (HSTS, X-Frame-Options, X-Content-Type-Options, CSP)
- [ ] إضافة rate limiting على `/api/auth/resend-verification` و `/api/auth/verify-email`
- [ ] إضافة HTML/XSS sanitization على المحتوى اللي يدخله المستخدم (أسماء، وصف، رسائل)
- [ ] تحسين SameSite cookie من `lax` إلى `strict` للعمليات الحساسة
- [ ] التحقق من file type/size validation في جميع endpoints الرفع

### Type Safety
- [ ] إزالة `as any` type casting (14+ حالة في `server/routes.ts`)
- [ ] استبدال `(req.session as any)?.userId` بـ typed session interface
- [ ] استبدال `Record<string, any>` بأنواع محددة في الـ routes

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
- [ ] نقل email templates من routes.ts إلى ملفات منفصلة أو قاعدة البيانات

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
