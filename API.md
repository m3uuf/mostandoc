# توثيق مسارات API

## نظرة عامة

جميع المسارات تحت البادئة `/api/`. الاستجابات بصيغة JSON.
المصادقة عبر جلسات (cookies) - يجب إرسال `credentials: "include"` مع كل طلب.

### رموز الحالة

| الرمز | المعنى |
|-------|--------|
| 200 | نجاح |
| 201 | تم الإنشاء |
| 400 | خطأ في البيانات المُرسلة |
| 401 | غير مصادق (يجب تسجيل الدخول) |
| 403 | غير مصرح (صلاحيات غير كافية) |
| 404 | غير موجود |
| 409 | تعارض (بيانات مكررة) |
| 429 | تجاوز حد الطلبات |
| 500 | خطأ في السيرفر |

### Rate Limiting

| النطاق | الحد | الفترة |
|--------|------|--------|
| `/api/*` (عام) | 100 طلب | 15 دقيقة |
| `/api/auth/login`, `/api/auth/register` | 10 طلبات | 15 دقيقة |
| `/api/public/:username/contact` | 5 طلبات | 15 دقيقة |

---

## المصادقة (Auth)

### `POST /api/auth/register`
تسجيل حساب جديد.

**الجسم:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "firstName": "أحمد",
  "lastName": "محمد",
  "phone": "0501234567"
}
```

**الاستجابة:** `200` - بيانات المستخدم (بدون `passwordHash`)

**الأخطاء:**
- `409` - البريد مسجل مسبقاً

---

### `POST /api/auth/login`
تسجيل الدخول.

**الجسم:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**الاستجابة:** `200` - بيانات المستخدم

**الأخطاء:**
- `401` - بيانات الدخول غير صحيحة
- `403` - الحساب معلّق

---

### `POST /api/auth/logout`
تسجيل الخروج. يحذف الجلسة ويمسح الكوكي.

**الاستجابة:** `200` - `{ message: "تم تسجيل الخروج" }`

---

### `GET /api/auth/user`
الحصول على بيانات المستخدم الحالي.

**الاستجابة:** `200` - بيانات المستخدم أو `401` إذا غير مسجل.

---

### `PATCH /api/auth/user`
تحديث بيانات الحساب.

**الجسم:**
```json
{
  "firstName": "أحمد",
  "lastName": "محمد",
  "email": "new@example.com"
}
```

---

### `POST /api/auth/forgot-password`
طلب إعادة تعيين كلمة المرور.

**الجسم:**
```json
{ "email": "user@example.com" }
```

**الاستجابة:** `200` دائمًا (لمنع كشف وجود الحساب)

---

### `GET /api/auth/reset-password/validate?token=...`
التحقق من صلاحية توكن إعادة التعيين.

---

### `POST /api/auth/reset-password`
إعادة تعيين كلمة المرور.

**الجسم:**
```json
{
  "token": "abc123...",
  "password": "newpassword"
}
```

---

### `GET /api/auth/verify-email?token=...`
التحقق من البريد الإلكتروني.

---

### `POST /api/auth/resend-verification`
إعادة إرسال رابط التحقق من البريد. يتطلب مصادقة.

---

### `GET /api/auth/google`
بدء مصادقة Google OAuth. يعيد توجيه إلى Google.

### `GET /api/auth/google/callback`
نقطة العودة من Google OAuth.

### `GET /api/auth/facebook`
بدء مصادقة Facebook OAuth.

### `GET /api/auth/facebook/callback`
نقطة العودة من Facebook OAuth.

### `GET /api/auth/apple`
بدء مصادقة Apple Sign-In.

### `POST /api/auth/apple/callback`
نقطة العودة من Apple Sign-In.

### `GET /api/auth/providers`
استعلام المزودات المتاحة.

**الاستجابة:**
```json
{
  "google": true,
  "facebook": false,
  "apple": false
}
```

---

## لوحة التحكم (Dashboard)

### `GET /api/dashboard/stats` 🔒
إحصائيات لوحة التحكم.

**الاستجابة:**
```json
{
  "clients": 15,
  "activeContracts": 5,
  "pendingInvoices": { "count": 3, "total": "15000.00" },
  "activeProjects": 4
}
```

### `GET /api/dashboard/overdue-invoices` 🔒
الفواتير المتأخرة.

### `GET /api/dashboard/expiring-contracts` 🔒
العقود التي تنتهي خلال 30 يوم.

---

## الملف الشخصي (Profile)

### `GET /api/profile` 🔒
الحصول على الملف الشخصي.

### `POST /api/profile` 🔒
إنشاء ملف شخصي جديد.

### `PATCH /api/profile` 🔒
تحديث الملف الشخصي.

**الجسم (مثال):**
```json
{
  "username": "ahmed",
  "fullName": "أحمد محمد",
  "profession": "مطور",
  "bio": "مطور تطبيقات ويب",
  "primaryColor": "#3b82f6",
  "accentColor": "#f97316",
  "headerStyle": "gradient",
  "isPublic": true
}
```

---

## العملاء (Clients)

### `GET /api/clients` 🔒
قائمة العملاء مع التصفح والبحث.

**المعاملات:**
| المعامل | النوع | الوصف |
|---------|-------|-------|
| `page` | number | رقم الصفحة (افتراضي: 1) |
| `limit` | number | عدد النتائج (افتراضي: 10، أقصى: 100) |
| `search` | string | بحث في الاسم والبريد |
| `status` | string | تصفية بالحالة (active/prospect/inactive) |

**الاستجابة:**
```json
{
  "data": [...],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### `GET /api/clients/:id` 🔒
### `POST /api/clients` 🔒
### `PATCH /api/clients/:id` 🔒
### `DELETE /api/clients/:id` 🔒

**ملاحظة:** الحذف يفشل إذا كان للعميل عقود أو فواتير أو مشاريع مرتبطة.

---

## العقود (Contracts)

### `GET /api/contracts` 🔒
**المعاملات:** `page`, `limit`, `status`, `search`

### `GET /api/contracts/:id` 🔒
### `POST /api/contracts` 🔒

**الجسم:**
```json
{
  "clientId": "uuid",
  "title": "عقد خدمات",
  "description": "وصف العقد",
  "content": "نص العقد الكامل...",
  "value": "5000.00",
  "currency": "SAR",
  "status": "draft",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31"
}
```

### `PATCH /api/contracts/:id` 🔒
### `DELETE /api/contracts/:id` 🔒

---

## الفواتير (Invoices)

### `GET /api/invoices` 🔒
**المعاملات:** `page`, `limit`, `status`

### `GET /api/invoices/next-number` 🔒
يُرجع الرقم التالي (مثل `INV-0005`).

### `GET /api/invoices/:id` 🔒
يُرجع الفاتورة مع بنودها.

### `POST /api/invoices` 🔒

**الجسم:**
```json
{
  "clientId": "uuid",
  "invoiceNumber": "INV-0005",
  "status": "draft",
  "issueDate": "2026-03-01",
  "dueDate": "2026-03-31",
  "subtotal": "1000.00",
  "vatRate": "15.00",
  "vatAmount": "150.00",
  "total": "1150.00",
  "notes": "ملاحظات",
  "paymentMethod": "bank_transfer",
  "items": [
    {
      "description": "تصميم واجهة",
      "quantity": 1,
      "unitPrice": "1000.00",
      "total": "1000.00",
      "sortOrder": 0
    }
  ]
}
```

### `PATCH /api/invoices/:id` 🔒
يُحدّث الفاتورة ويستبدل جميع البنود.

### `DELETE /api/invoices/:id` 🔒
يحذف الفاتورة وبنودها.

---

## المشاريع (Projects)

### `GET /api/projects` 🔒
**المعاملات:** `page`, `limit`, `status`

### `GET /api/projects/:id` 🔒
يُرجع المشروع مع مهامه.

### `POST /api/projects` 🔒

**الجسم:**
```json
{
  "clientId": "uuid",
  "contractId": "uuid",
  "name": "تطوير موقع",
  "description": "وصف المشروع",
  "status": "not_started",
  "priority": "high",
  "startDate": "2026-03-01",
  "deadline": "2026-06-30",
  "budget": "25000.00"
}
```

### `PATCH /api/projects/:id` 🔒
### `DELETE /api/projects/:id` 🔒
يحذف المشروع وجميع مهامه.

### `GET /api/projects/:id/tasks` 🔒
### `POST /api/projects/:id/tasks` 🔒

**الجسم:**
```json
{
  "title": "تصميم الصفحة الرئيسية",
  "description": "وصف المهمة",
  "status": "todo",
  "priority": "medium",
  "dueDate": "2026-04-15"
}
```

### `PATCH /api/tasks/:id` 🔒
### `DELETE /api/tasks/:id` 🔒

---

## الخدمات (Services)

### `GET /api/services` 🔒
### `POST /api/services` 🔒
### `PATCH /api/services/:id` 🔒
### `DELETE /api/services/:id` 🔒

---

## المعرض (Portfolio)

### `GET /api/portfolio` 🔒
### `POST /api/portfolio` 🔒
### `PATCH /api/portfolio/:id` 🔒
### `DELETE /api/portfolio/:id` 🔒

---

## الرسائل (Messages)

### `GET /api/messages` 🔒
قائمة رسائل التواصل المُستلمة.

### `PATCH /api/messages/:id/read` 🔒
تعليم رسالة كمقروءة.

---

## الإشعارات (Notifications)

### `GET /api/notifications` 🔒
**المعاملات:** `page`, `limit`

### `GET /api/notifications/unread-count` 🔒

**الاستجابة:**
```json
{ "count": 5 }
```

### `PATCH /api/notifications/:id/read` 🔒
### `POST /api/notifications/read-all` 🔒

---

## الصفحة العامة (Public)

### `GET /api/public/:username`
الحصول على بيانات الملف الشخصي العام (بدون مصادقة).

**الاستجابة:**
```json
{
  "profile": { ... },
  "services": [ ... ],
  "portfolio": [ ... ]
}
```

### `POST /api/public/:username/contact`
إرسال رسالة تواصل (محمي بـ Rate Limit: 5/15 دقيقة).

**الجسم:**
```json
{
  "senderName": "خالد",
  "senderEmail": "khaled@example.com",
  "message": "أريد الاستفسار عن خدماتكم"
}
```

---

## المستندات (Documents)

### `GET /api/documents` 🔒
### `GET /api/documents/:id` 🔒
يُرجع المستند مع الحقول والتوقيعات.

### `POST /api/documents` 🔒

**الجسم (مستند نصي):**
```json
{
  "title": "عقد العمل",
  "docType": "text",
  "content": "<h1>عقد العمل</h1><p>...</p>"
}
```

**الجسم (مستند ملف):**
```json
{
  "title": "عقد موقّع",
  "docType": "file",
  "fileUrl": "https://storage.example.com/file.pdf",
  "fileType": "pdf"
}
```

### `PATCH /api/documents/:id` 🔒
### `DELETE /api/documents/:id` 🔒

### `POST /api/documents/:id/fields` 🔒
### `PATCH /api/documents/:docId/fields/:fieldId` 🔒
### `DELETE /api/documents/:docId/fields/:fieldId` 🔒
### `PUT /api/documents/:id/fields` 🔒
حفظ جميع حقول المستند (يستبدل الحقول الموجودة).

### `GET /api/documents/sign/:shareToken`
عرض المستند للتوقيع (بدون مصادقة).

### `POST /api/documents/sign/:shareToken`
إرسال التوقيع (بدون مصادقة).

**الجسم:**
```json
{
  "signerName": "خالد أحمد",
  "signerEmail": "khaled@example.com",
  "signatureData": "data:image/png;base64,...",
  "fieldValues": {
    "field-uuid-1": "قيمة",
    "field-uuid-2": "2026-03-12"
  }
}
```

---

## الاشتراكات (Subscriptions)

### `GET /api/subscription` 🔒
بيانات الاشتراك الحالي.

### `POST /api/subscription/checkout` 🔒
إنشاء جلسة دفع Stripe.

**الجسم:**
```json
{ "plan": "pro" }
```

**الاستجابة:**
```json
{ "url": "https://checkout.stripe.com/..." }
```

### `POST /api/subscription/portal` 🔒
إنشاء رابط بوابة Stripe لإدارة الاشتراك.

### `POST /api/webhooks/stripe`
Stripe Webhook (بدون مصادقة، يتحقق من التوقيع).

**الأحداث المدعومة:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### `GET /api/config/stripe`
يُرجع المفتاح العام لـ Stripe.

---

## معاينة PDF

### `GET /api/pdf-preview?url=...` 🔒
تحويل صفحة PDF إلى صورة PNG عبر `pdftoppm`.

---

## لوحة الإدارة (Admin) 🔒👑

> تتطلب دور `admin` أو `superadmin`

### `GET /api/admin/stats`
إحصائيات المنصة الشاملة.

**الاستجابة:**
```json
{
  "totalUsers": 150,
  "newUsersToday": 3,
  "activeUsers": 120,
  "newUsersThisWeek": 15,
  "suspendedUsers": 5,
  "totalContracts": 300,
  "totalProfiles": 80,
  "totalClients": 500
}
```

### `GET /api/admin/users`
**المعاملات:** `page`, `limit`, `search`

### `PATCH /api/admin/users/:id`

**الجسم:**
```json
{
  "role": "admin",
  "isSuspended": false,
  "subscriptionPlan": "pro",
  "subscriptionStatus": "active"
}
```

### `DELETE /api/admin/users/:id`
**حمايات:** لا يمكن حذف نفسك، ولا يمكن حذف superadmin.

---

## الترحيل (Migration) 🔒👑

### `GET /api/admin/migrate/preview`
معاينة بيانات الترحيل (عدد السجلات في كل ملف JSON).

### `GET /api/admin/migrate/state`
حالة عملية الترحيل الحالية.

### `POST /api/admin/migrate/users`
ترحيل المستخدمين من ملفات Bubble.io.

### `POST /api/admin/migrate/clients`
ترحيل العملاء.

### `POST /api/admin/migrate/contracts`
ترحيل العقود.

### `POST /api/admin/migrate/profiles`
ترحيل الملفات الشخصية.

### `POST /api/admin/migrate/reset`
إعادة تعيين حالة الترحيل.

---

## مكتبة المحتوى (Content Library)

### `GET /api/content-library` 🔒
قائمة المحتوى المحفوظ لإعادة الاستخدام.

### `POST /api/content-library` 🔒
حفظ محتوى جديد.

**الجسم:**
```json
{
  "title": "فقرة شروط الدفع",
  "content": "<p>يتم الدفع خلال 30 يوم...</p>",
  "category": "contract"
}
```

### `PATCH /api/content-library/:id` 🔒
### `DELETE /api/content-library/:id` 🔒

---

## الذكاء الاصطناعي (AI)

### `POST /api/ai/generate` 🔒
توليد محتوى بالذكاء الاصطناعي (بدون بث).

**الجسم:**
```json
{
  "prompt": "حسّن هذا النص",
  "content": "النص المراد تحسينه...",
  "action": "improve"
}
```

**الأوامر المتاحة (`action`):**
`improve`, `fix_grammar`, `translate`, `summarize`, `expand`, `shorten`, `tone`, `complete`, `generate`, `custom`

**الاستجابة:**
```json
{
  "result": "النص المُحسّن..."
}
```

### `POST /api/ai/stream` 🔒
توليد محتوى مع بث مباشر (Server-Sent Events).

نفس الجسم كـ `/api/ai/generate` لكن الاستجابة تكون stream.

---

## رفع الملفات (Uploads)

### `POST /api/uploads/request-url` 🔒
طلب رابط رفع مباشر (Presigned URL) لـ Google Cloud Storage.

**الجسم:**
```json
{
  "filename": "contract.pdf",
  "contentType": "application/pdf"
}
```

**الاستجابة:**
```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "fileUrl": "https://storage.googleapis.com/..."
}
```

---

## الرموز

| الرمز | المعنى |
|-------|--------|
| 🔒 | يتطلب مصادقة (isAuthenticated) |
| 👑 | يتطلب صلاحيات إدارية (isAdmin) |
