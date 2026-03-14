# دليل التثبيت والإعداد - Setup Guide

## المتطلبات الأساسية

| المتطلب | الإصدار المطلوب |
|---------|----------------|
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ |

### خدمات خارجية مطلوبة

| الخدمة | الاستخدام | مطلوب؟ |
|--------|-----------|--------|
| **PostgreSQL** | قاعدة البيانات | نعم - إلزامي |
| **Stripe** | المدفوعات والاشتراكات | اختياري (بدونه لا تعمل المدفوعات) |
| **Resend** | البريد الإلكتروني | اختياري (بدونه لا يعمل إرسال البريد) |
| **Google OAuth** | تسجيل دخول Google | اختياري |
| **Facebook OAuth** | تسجيل دخول Facebook | اختياري |
| **Apple Sign-In** | تسجيل دخول Apple | اختياري |
| **Replit Object Storage** | تخزين الملفات | اختياري (للرفع على Replit) |

---

## خطوات التثبيت

### 1. استنساخ المشروع

```bash
git clone https://github.com/m3uuf/mostandoc.git
cd mostandoc
```

### 2. تثبيت المتطلبات

```bash
npm install
```

### 3. إعداد قاعدة البيانات

أنشئ قاعدة بيانات PostgreSQL:

```sql
CREATE DATABASE mostandoc;
```

### 4. إعداد المتغيرات البيئية

أنشئ ملف `.env` في جذر المشروع:

```env
# ──────────────────────────────────────
# قاعدة البيانات (إلزامي)
# ──────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/mostandoc

# ──────────────────────────────────────
# الجلسات (إلزامي)
# ──────────────────────────────────────
SESSION_SECRET=your-secret-key-here-at-least-32-chars

# ──────────────────────────────────────
# Stripe - المدفوعات (اختياري)
# ──────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ──────────────────────────────────────
# Resend - البريد الإلكتروني (اختياري)
# ──────────────────────────────────────
RESEND_API_KEY=re_...

# ──────────────────────────────────────
# Google OAuth (اختياري)
# ──────────────────────────────────────
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# ──────────────────────────────────────
# Facebook OAuth (اختياري)
# ──────────────────────────────────────
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# ──────────────────────────────────────
# Apple Sign-In (اختياري)
# ──────────────────────────────────────
APPLE_CLIENT_ID=...
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY_PATH=...

# ──────────────────────────────────────
# عام
# ──────────────────────────────────────
PORT=5000
NODE_ENV=development
```

### 5. إنشاء جداول قاعدة البيانات

```bash
npm run db:push
```

هذا الأمر يستخدم Drizzle Kit لمزامنة مخطط قاعدة البيانات من تعريفات `shared/schema.ts`.

### 6. تشغيل بيئة التطوير

```bash
npm run dev
```

سيعمل التطبيق على `http://localhost:5000`

---

## الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل بيئة التطوير (Vite HMR + Express) |
| `npm run build` | بناء المشروع للإنتاج |
| `npm start` | تشغيل نسخة الإنتاج |
| `npm run check` | فحص الأنواع (TypeScript) |
| `npm run db:push` | مزامنة مخطط قاعدة البيانات |

---

## بنية البناء (Build)

عند تشغيل `npm run build`:

1. **يبني العميل:** Vite يُخرج الملفات إلى `dist/public/`
2. **يبني السيرفر:** esbuild يُحول `server/index.ts` إلى `dist/index.cjs`

```
dist/
├── index.cjs          # حزمة السيرفر (CommonJS)
└── public/            # ملفات الواجهة الأمامية المبنية
    ├── index.html
    ├── assets/
    └── ...
```

### تشغيل الإنتاج

```bash
npm run build
npm start
# أو مباشرة:
NODE_ENV=production node dist/index.cjs
```

---

## إعداد Stripe

### 1. إنشاء حساب Stripe
- سجّل في [stripe.com](https://stripe.com)
- انسخ المفاتيح من Dashboard > Developers > API keys

### 2. إعداد Webhook
- اذهب إلى Dashboard > Developers > Webhooks
- أضف endpoint: `https://your-domain.com/api/webhooks/stripe`
- اختر الأحداث:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- انسخ Webhook Secret إلى `STRIPE_WEBHOOK_SECRET`

### 3. الخطط المُعرّفة

| الخطة | السعر | بالهللة |
|-------|-------|---------|
| Starter | 29 ر.س/شهر | 2900 |
| Pro | 59 ر.س/شهر | 5900 |
| Business | 99 ر.س/شهر | 9900 |

يجب إنشاء منتجات وأسعار متطابقة في Stripe Dashboard.

---

## إعداد Resend (البريد)

### 1. إنشاء حساب
- سجّل في [resend.com](https://resend.com)
- أنشئ API Key

### 2. إعداد النطاق
- أضف نطاقك وتحقق منه عبر DNS records
- البريد الافتراضي المُرسل: `noreply@your-domain.com`

### الرسائل المُرسلة
- رابط التحقق من البريد (عند التسجيل)
- رابط إعادة تعيين كلمة المرور
- رابط التوقيع الإلكتروني (عند إرسال مستند)
- رسائل ترحيل البيانات

---

## إعداد Google OAuth

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. أنشئ مشروع جديد
3. فعّل Google+ API
4. اذهب إلى Credentials > Create OAuth Client ID
5. نوع التطبيق: Web Application
6. أضف Authorized redirect URI: `https://your-domain.com/api/auth/google/callback`
7. انسخ Client ID و Client Secret

---

## إعداد Facebook OAuth

1. اذهب إلى [Facebook Developers](https://developers.facebook.com)
2. أنشئ تطبيق جديد
3. أضف منتج Facebook Login
4. أضف Valid OAuth Redirect URI: `https://your-domain.com/api/auth/facebook/callback`
5. انسخ App ID و App Secret

---

## النشر على Replit

المشروع مُجهز للعمل على Replit مباشرة:

1. استورد المشروع من GitHub
2. أضف المتغيرات البيئية في Secrets
3. Replit يوفر PostgreSQL تلقائيًا عبر `DATABASE_URL`
4. Replit يوفر Object Storage لرفع الملفات
5. شغّل المشروع

---

## استكشاف الأخطاء

### خطأ في الاتصال بقاعدة البيانات
```
Error: DATABASE_URL environment variable is required
```
تأكد من وجود `DATABASE_URL` في ملف `.env`

### خطأ في إنشاء الجداول
```bash
# أعد تشغيل المزامنة
npm run db:push
```

### خطأ في الجلسات
تأكد من وجود `SESSION_SECRET` في المتغيرات البيئية.

### الملفات الثابتة لا تعمل في الإنتاج
تأكد من تشغيل `npm run build` قبل `npm start`.

### Stripe Webhooks لا تعمل محليًا
استخدم Stripe CLI للاختبار المحلي:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```
