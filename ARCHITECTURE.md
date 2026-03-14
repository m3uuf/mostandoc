# البنية التقنية - Architecture

## نظرة عامة على المعمارية

مستندك هو تطبيق Full-Stack يتبع نمط **Monorepo** مع فصل واضح بين الواجهة الأمامية والخلفية، مع كود مشترك.

```
┌─────────────────────────────────────────────────────┐
│                    العميل (Client)                    │
│  React 18 + TypeScript + Vite + ShadCN UI           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Pages   │ │Components│ │  Hooks   │            │
│  └────┬─────┘ └──────────┘ └────┬─────┘            │
│       │                         │                    │
│  ┌────┴─────────────────────────┴─────┐             │
│  │       TanStack Query Client        │             │
│  └────────────────┬───────────────────┘             │
└───────────────────┼─────────────────────────────────┘
                    │ HTTP/JSON (credentials: include)
┌───────────────────┼─────────────────────────────────┐
│                   │ السيرفر (Server)                  │
│  ┌────────────────┴───────────────────┐             │
│  │         Express.js Routes          │             │
│  │    (Rate Limited + Auth Middleware) │             │
│  └────────────────┬───────────────────┘             │
│                   │                                  │
│  ┌────────────────┴───────────────────┐             │
│  │     Storage Layer (Repository)     │             │
│  │         IStorage Interface         │             │
│  └────────────────┬───────────────────┘             │
│                   │                                  │
│  ┌────────────────┴───────────────────┐             │
│  │      Drizzle ORM + pg Pool        │             │
│  └────────────────┬───────────────────┘             │
└───────────────────┼─────────────────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────┐
│           PostgreSQL Database                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │users │ │clients│ │contracts│ │invoices│ │docs │    │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │
└─────────────────────────────────────────────────────┘
```

## طبقات التطبيق

### 1. طبقة العرض (Presentation Layer)

**الموقع:** `client/src/`

- **React 18** مع TypeScript للواجهة
- **ShadCN UI** + **Radix UI** لمكونات واجهة المستخدم
- **Tailwind CSS** للتنسيق مع دعم RTL كامل
- **Wouter** للتوجيه (خفيف الوزن بديل عن React Router)
- **TanStack Query v5** لإدارة حالة السيرفر والتخزين المؤقت
- **TipTap** لمحرر النصوص الغنية
- **Framer Motion** للرسوم المتحركة

**نمط إدارة الحالة:**
```
Server State → TanStack Query (staleTime: Infinity, no refetch)
Auth State   → TanStack Query + Custom Hook (useAuth)
Theme State  → React Context (ThemeProvider)
Form State   → React Hook Form + Zod validation
Toast State  → Custom Reducer Pattern (خارج شجرة React)
```

### 2. طبقة التوجيه (Routing Layer)

**الموقع:** `client/src/App.tsx`

نمط التوجيه يميز بين 3 أنواع:

| النوع | المسارات | الحماية |
|-------|----------|---------|
| **عامة** | `/`, `/p/:username`, `/sign/:token`, `/auth` | لا تحتاج مصادقة |
| **مصادق عليها** | `/dashboard/*` | تتطلب `user` من `useAuth()` |
| **إدارية** | `/dashboard/admin/*` | تتطلب `role: admin/superadmin` |

```
/ ──→ Landing (غير مسجل) أو redirect /dashboard (مسجل)
/auth ──→ Auth Page (غير مسجل) أو redirect /dashboard (مسجل)
/dashboard ──→ AuthenticatedLayout ──→ Sidebar + Content
/p/:username ──→ Public Profile (بدون sidebar)
/sign/:token ──→ Sign Document (بدون sidebar)
```

### 3. طبقة API (API Layer)

**الموقع:** `server/routes.ts`

- **Express.js 5** مع TypeScript
- جميع المسارات تحت `/api/`
- **Rate Limiting** على 3 مستويات:
  - عام: 100 طلب / 15 دقيقة
  - مصادقة: 10 طلبات / 15 دقيقة
  - نموذج تواصل: 5 طلبات / 15 دقيقة
- **Middleware المصادقة:** `isAuthenticated` (يتحقق من الجلسة)
- **Middleware الإدارة:** `isAdmin` (يتحقق من الدور)

### 4. طبقة الوصول للبيانات (Data Access Layer)

**الموقع:** `server/storage.ts`

يتبع نمط **Repository Pattern**:

```typescript
interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>
  getUserByEmail(email: string): Promise<User | undefined>

  // Clients
  getClients(userId, params, search?, status?): Promise<PaginatedResult<Client>>
  getClient(id): Promise<Client | undefined>
  createClient(data): Promise<Client>
  updateClient(id, data): Promise<Client>
  deleteClient(id): Promise<void>

  // ... باقي العمليات لكل كيان
}

class DatabaseStorage implements IStorage {
  // التنفيذ باستخدام Drizzle ORM
}

export const storage = new DatabaseStorage()
```

**فوائد هذا النمط:**
- فصل منطق قاعدة البيانات عن منطق المسارات
- سهولة الاختبار عبر Mock للواجهة
- إمكانية تبديل قاعدة البيانات دون تغيير المسارات

### 5. طبقة قاعدة البيانات (Database Layer)

**الموقع:** `server/db.ts` + `shared/schema.ts`

- **PostgreSQL** كقاعدة بيانات رئيسية
- **Drizzle ORM** لبناء الاستعلامات بنمط Type-safe
- **Drizzle Kit** لإدارة الترحيلات
- **Drizzle-Zod** لتوليد مخططات التحقق تلقائيًا
- **connect-pg-simple** لتخزين الجلسات في PostgreSQL

```typescript
// اتصال قاعدة البيانات
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: * })
```

## نظام المصادقة

### المصادقة بالبريد/كلمة المرور

```
┌─────────┐    POST /api/auth/register     ┌──────────┐
│ العميل  │ ──────────────────────────────→ │ السيرفر  │
│         │    {email, password, name}      │          │
│         │                                 │ bcrypt   │
│         │    Set-Cookie: session_id       │ hash(12) │
│         │ ←────────────────────────────── │          │
└─────────┘                                 └────┬─────┘
                                                 │
                                            ┌────┴─────┐
                                            │PostgreSQL │
                                            │ sessions  │
                                            │ table     │
                                            └──────────┘
```

### المصادقة عبر OAuth

```
العميل → GET /api/auth/google → Redirect Google → Callback → Session → Dashboard
العميل → GET /api/auth/facebook → Redirect Facebook → Callback → Session → Dashboard
العميل → GET /api/auth/apple → Redirect Apple → Callback → Session → Dashboard
```

### تدفق إعادة تعيين كلمة المرور

```
1. POST /api/auth/forgot-password → يولّد Token (صالح ساعة واحدة)
2. يُرسل رابط عبر Resend إلى البريد
3. GET /api/auth/reset-password/validate?token=... → يتحقق من صلاحية التوكن
4. POST /api/auth/reset-password → يحدّث كلمة المرور ويُعلّم التوكن كمستخدم
```

### تدفق التحقق من البريد

```
1. POST /api/auth/register → يولّد Token (صالح 24 ساعة)
2. يُرسل رابط عبر Resend
3. GET /api/auth/verify-email?token=... → يُعلّم البريد كمُتحقق
```

## نظام رفع الملفات

يتبع نمط **Presigned URL** للرفع المباشر:

```
1. العميل → POST /api/uploads/request-url (metadata)
2. السيرفر → يولّد Presigned URL من Object Storage
3. العميل → PUT (ملف مباشرة إلى Storage)
4. العميل → يحفظ المسار في قاعدة البيانات
```

## نظام المدفوعات (Stripe)

```
┌─────────┐   POST /checkout    ┌──────────┐
│ العميل  │ ──────────────────→ │ السيرفر  │
│         │                     │          │
│         │   Redirect URL      │ Stripe   │
│         │ ←────────────────── │ API      │
│         │                     └──────────┘
│         │                          │
│         │   Stripe Checkout        │
│         │ ──────────────────→ ┌────┴─────┐
│         │                     │ Stripe   │
│         │   Payment Complete  │ Hosted   │
│         │ ←────────────────── │ Page     │
│         │                     └──────────┘
│         │                          │
│         │                     ┌────┴─────┐
│         │   Webhook Events    │ Stripe   │
│         │                     │ Webhooks │
│         │                     └────┬─────┘
│         │                          │
│         │                     ┌────┴─────┐
│         │                     │ تحديث    │
│         │                     │ الاشتراك │
│         │                     │ في DB    │
│         │                     └──────────┘
└─────────┘

الخطط:
- Starter: 29 ر.س/شهر (2900 هللة)
- Pro: 59 ر.س/شهر (5900 هللة)
- Business: 99 ر.س/شهر (9900 هللة)
- تجربة مجانية: 14 يوم
```

## نظام التوقيع الإلكتروني (شبيه PandaDoc)

```
1. المستخدم → ينشئ مستند (نص أو ملف)
2. المستخدم → يضع حقول النماذج (نص، تاريخ، توقيع، أحرف أولى) على المستند
3. المستخدم → يرسل المستند → يتغير الحالة إلى "sent"
4. النظام → يولّد shareToken فريد
5. المستلم → يفتح /sign/:shareToken (بدون تسجيل دخول)
6. المستلم → يملأ الحقول ويرسم توقيعه
7. النظام → يحفظ التوقيع + قيم الحقول + IP + التاريخ
8. النظام → ربط تلقائي بالعميل (إذا تطابق البريد)
9. المستند → يتغير إلى "signed" + إشعار للمالك
```

## نظام الذكاء الاصطناعي (AI)

```
┌─────────┐   POST /api/ai/stream     ┌──────────┐
│ المحرر  │ ──────────────────────────→ │ السيرفر  │
│ (TipTap)│   {action, content}        │          │
│         │                            │          │
│         │   SSE (Server-Sent Events) │ Claude   │
│         │ ←────────────────────────── │ API      │
│         │   حرف بحرف                 │          │
└─────────┘                            └──────────┘

الأوامر:
- improve, fix_grammar, translate, summarize
- expand, shorten, tone (formal/friendly/marketing)
- complete, generate, custom
```

## نظام القوالب والمحتوى

```
┌──────────────────────────────────────────┐
│            editor-templates.ts            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ عقود     │ │ مستندات  │ │ عروض     │ │
│  │ (4 قالب) │ │ (3 قالب) │ │ (3 قالب) │ │
│  └──────────┘ └──────────┘ └──────────┘ │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│            مكتبة المحتوى                  │
│  ─ حفظ فقرات متكررة                      │
│  ─ تصنيف (عام، عقد، قالب)               │
│  ─ إدراج سريع في المحرر                  │
└──────────────────────────────────────────┘
```

## بنية الأمان

### حماية الجلسات
- تخزين في PostgreSQL عبر `connect-pg-simple`
- مدة الجلسة: 7 أيام
- `httpOnly: true`, `secure: true` (في الإنتاج)
- `sameSite: "lax"`

### Rate Limiting
- عام: 100 طلب / 15 دقيقة
- مصادقة: 10 طلبات / 15 دقيقة
- نموذج تواصل: 5 طلبات / 15 دقيقة

### التحقق من البيانات
- **Zod** على الجانبين (عميل + سيرفر)
- مخططات مشتركة في `shared/schema.ts`
- رسائل خطأ بالعربية

### نظام الأدوار
```
user < admin < superadmin
```
- `user`: الصلاحيات الأساسية
- `admin`: الوصول للوحة الإدارة
- `superadmin`: جميع الصلاحيات + لا يمكن حذفه

### حماية البيانات
- كل استعلام مُقيّد بـ `userId` للمستخدم الحالي
- التحقق من الملكية عند التعديل والحذف
- `bcrypt` (12 rounds) لتشفير كلمات المرور
- Tokens عشوائية (32 bytes hex) مع صلاحية محددة

## نمط التصميم للواجهة

### نظام الألوان (Design Tokens)

يستخدم متغيرات CSS بنمط HSL:

```css
:root {
  --primary: 228 74% 56%;        /* أزرق */
  --sidebar: 228 45% 16%;        /* أزرق داكن */
  --sidebar-primary: 22 79% 54%; /* برتقالي (accent) */
}

.dark {
  --primary: 228 74% 65%;
  --background: 228 25% 8%;
}
```

### دعم RTL
- الاتجاه الأساسي: RTL
- الخط: IBM Plex Sans Arabic
- القائمة الجانبية على اليمين
- أيقونات التنقل معكوسة

## بيئة التشغيل

### التطوير
```
Vite Dev Server (HMR) ←→ Express.js ←→ PostgreSQL
      (client)              (server)
```

### الإنتاج
```
Express.js (static files from dist/public) ←→ PostgreSQL
    (server + client bundle)
```

### البناء
```bash
# يستخدم esbuild لبناء السيرفر و Vite لبناء العميل
tsx script/build.ts
→ dist/index.cjs (server bundle)
→ dist/public/ (client bundle)
```
