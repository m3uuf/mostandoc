# مخطط قاعدة البيانات - Database Schema

## نظرة عامة

قاعدة البيانات **PostgreSQL** مُدارة عبر **Drizzle ORM** مع تعريفات في `shared/schema.ts` و `shared/models/auth.ts`.

- جميع المعرفات (`id`) من نوع `varchar` مع قيمة افتراضية `gen_random_uuid()`
- جميع الجداول تحتوي على `createdAt` (timestamp)
- معظم الجداول تحتوي على `updatedAt` (timestamp)
- العملة الافتراضية: SAR (ريال سعودي)
- نسبة VAT الافتراضية: 15%

---

## مخطط العلاقات (ERD)

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  users   │────→│ profiles │     │ subscriptions│
│          │     └──────────┘     └──────────────┘
│          │          │
│          │     ┌────┴─────┐     ┌──────────────┐
│          │     │ services │     │portfolio_items│
│          │     └──────────┘     └──────────────┘
│          │          │
│          │     ┌────┴──────────┐
│          │     │contact_messages│
│          │     └───────────────┘
│          │
│          │────→┌──────────┐     ┌──────────────┐
│          │     │ clients  │     │              │
│          │     └────┬─────┘     │              │
│          │          │           │              │
│          │────→┌────┴─────┐    │              │
│          │     │contracts │    │              │
│          │     └──────────┘    │              │
│          │                      │              │
│          │────→┌──────────┐    │              │
│          │     │invoices  │───→│invoice_items │
│          │     └──────────┘    └──────────────┘
│          │
│          │────→┌──────────┐    ┌──────────────┐
│          │     │projects  │───→│project_tasks │
│          │     └──────────┘    └──────────────┘
│          │
│          │────→┌──────────┐    ┌──────────────┐    ┌───────────────────┐
│          │     │documents │───→│document_fields│   │document_signatures│
│          │     └──────────┘    └──────────────┘    └───────────────────┘
│          │
│          │────→┌──────────────┐
│          │     │notifications │
└──────────┘     └──────────────┘
```

---

## جدول المستخدمين - `users`

**الملف:** `shared/models/auth.ts`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `email` | varchar (unique) | البريد الإلكتروني |
| `passwordHash` | varchar | كلمة المرور المشفرة (bcrypt 12 rounds) |
| `firstName` | varchar | الاسم الأول |
| `lastName` | varchar | اسم العائلة |
| `phone` | varchar | رقم الهاتف |
| `profileImageUrl` | varchar | رابط صورة الملف الشخصي |
| `googleId` | varchar (unique) | معرف Google OAuth |
| `facebookId` | varchar (unique) | معرف Facebook OAuth |
| `appleId` | varchar (unique) | معرف Apple Sign-In |
| `authProvider` | varchar | مزود المصادقة (email/google/facebook/apple) |
| `emailVerified` | boolean | هل البريد مُتحقق منه |
| `role` | varchar | الدور (user/admin/superadmin) |
| `isSuspended` | boolean | هل الحساب معلّق |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

---

## جدول الجلسات - `sessions`

**الملف:** `shared/models/auth.ts`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `sid` | varchar (PK) | معرف الجلسة |
| `sess` | jsonb | بيانات الجلسة |
| `expire` | timestamp (indexed) | وقت انتهاء الصلاحية |

---

## جدول توكنات إعادة تعيين كلمة المرور - `password_reset_tokens`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar | معرف المستخدم |
| `token` | varchar (unique, indexed) | التوكن (32 bytes hex) |
| `expiresAt` | timestamp | صالح لمدة ساعة واحدة |
| `used` | boolean | هل تم استخدامه |
| `createdAt` | timestamp | تاريخ الإنشاء |

---

## جدول توكنات التحقق من البريد - `email_verification_tokens`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar | معرف المستخدم |
| `token` | varchar (unique, indexed) | التوكن (32 bytes hex) |
| `expiresAt` | timestamp | صالح لمدة 24 ساعة |
| `used` | boolean | هل تم استخدامه |
| `createdAt` | timestamp | تاريخ الإنشاء |

---

## جدول الملفات الشخصية - `profiles`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (unique) | معرف المستخدم |
| `username` | varchar (unique) | اسم المستخدم للرابط العام |
| `fullName` | varchar | الاسم الكامل |
| `bio` | text | نبذة تعريفية |
| `profession` | varchar | المهنة |
| `location` | varchar | الموقع |
| `publicEmail` | varchar | بريد التواصل العام |
| `publicPhone` | varchar | هاتف التواصل العام |
| `website` | varchar | الموقع الإلكتروني |
| `companyName` | varchar | اسم الشركة |
| `companyAddress` | varchar | عنوان الشركة |
| `taxNumber` | varchar | الرقم الضريبي |
| `logoUrl` | varchar | رابط الشعار |
| `avatarUrl` | varchar | رابط الصورة الرمزية |
| `socialLinks` | jsonb | روابط التواصل الاجتماعي |
| `primaryColor` | varchar | اللون الأساسي |
| `accentColor` | varchar | لون التمييز |
| `headerStyle` | varchar | نمط الهيدر (gradient/solid/image/minimal) |
| `coverImageUrl` | varchar | رابط صورة الغلاف |
| `themeMode` | varchar | وضع السمة (light/dark) |
| `buttonStyle` | varchar | نمط الأزرار (filled/outlined) |
| `isPublic` | boolean | هل الصفحة عامة |
| `onboardingCompleted` | boolean | هل تم إكمال الإعداد |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

---

## جدول العملاء - `clients`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (indexed) | معرف المستخدم المالك |
| `name` | varchar | اسم العميل |
| `email` | varchar | البريد الإلكتروني |
| `phone` | varchar | رقم الهاتف |
| `company` | varchar | اسم الشركة |
| `status` | varchar | الحالة (active/prospect/inactive) |
| `notes` | text | ملاحظات |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

**الفهارس:** `userId`

**قيود الحذف:** لا يمكن حذف عميل لديه عقود أو فواتير أو مشاريع مرتبطة.

---

## جدول العقود - `contracts`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (indexed) | معرف المستخدم المالك |
| `clientId` | varchar | معرف العميل |
| `title` | varchar | عنوان العقد |
| `description` | text | وصف العقد |
| `content` | text | محتوى/نص العقد |
| `value` | decimal(12,2) | قيمة العقد |
| `currency` | varchar | العملة (SAR افتراضي) |
| `status` | varchar | الحالة (draft/active/completed/expired/terminated) |
| `startDate` | date | تاريخ البداية |
| `endDate` | date | تاريخ النهاية |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

**الفهارس:** `userId`

---

## جدول الفواتير - `invoices`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (indexed) | معرف المستخدم المالك |
| `clientId` | varchar | معرف العميل |
| `invoiceNumber` | varchar | رقم الفاتورة (INV-XXXX) |
| `status` | varchar | الحالة (draft/sent/paid/overdue/cancelled) |
| `issueDate` | date | تاريخ الإصدار |
| `dueDate` | date | تاريخ الاستحقاق |
| `subtotal` | decimal(12,2) | المجموع قبل الضريبة |
| `vatRate` | decimal(5,2) | نسبة الضريبة (15% افتراضي) |
| `vatAmount` | decimal(12,2) | مبلغ الضريبة |
| `total` | decimal(12,2) | المجموع الإجمالي |
| `notes` | text | ملاحظات |
| `paymentMethod` | varchar | طريقة الدفع |
| `paidAt` | timestamp | تاريخ الدفع |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

**الفهارس:** `userId`

---

## جدول بنود الفواتير - `invoice_items`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `invoiceId` | varchar | معرف الفاتورة |
| `description` | varchar | وصف البند |
| `quantity` | decimal(10,2) | الكمية |
| `unitPrice` | decimal(12,2) | سعر الوحدة |
| `total` | decimal(12,2) | الإجمالي |
| `sortOrder` | integer | ترتيب العرض |

**الحذف التتابعي:** عند حذف الفاتورة تُحذف جميع البنود.

---

## جدول المشاريع - `projects`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (indexed) | معرف المستخدم المالك |
| `clientId` | varchar | معرف العميل |
| `contractId` | varchar | معرف العقد المرتبط |
| `name` | varchar | اسم المشروع |
| `description` | text | وصف المشروع |
| `status` | varchar | الحالة (not_started/in_progress/on_hold/completed) |
| `priority` | varchar | الأولوية (low/medium/high/urgent) |
| `startDate` | date | تاريخ البداية |
| `deadline` | date | الموعد النهائي |
| `budget` | decimal(12,2) | الميزانية |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

**الفهارس:** `userId`

---

## جدول مهام المشاريع - `project_tasks`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `projectId` | varchar | معرف المشروع |
| `title` | varchar | عنوان المهمة |
| `description` | text | وصف المهمة |
| `status` | varchar | الحالة (todo/in_progress/review/done) |
| `priority` | varchar | الأولوية |
| `dueDate` | date | تاريخ الاستحقاق |
| `sortOrder` | integer | ترتيب العرض |
| `createdAt` | timestamp | تاريخ الإنشاء |

**الحذف التتابعي:** عند حذف المشروع تُحذف جميع المهام.

---

## جدول الخدمات - `services`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `profileId` | varchar | معرف الملف الشخصي |
| `title` | varchar | عنوان الخدمة |
| `description` | text | وصف الخدمة |
| `price` | decimal(12,2) | السعر |
| `priceType` | varchar | نوع السعر (fixed/hourly/negotiable) |
| `imageUrl` | varchar | رابط الصورة |
| `sortOrder` | integer | ترتيب العرض |
| `isActive` | boolean | هل الخدمة نشطة |
| `createdAt` | timestamp | تاريخ الإنشاء |

---

## جدول أعمال المعرض - `portfolio_items`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `profileId` | varchar | معرف الملف الشخصي |
| `title` | varchar | العنوان |
| `description` | text | الوصف |
| `imageUrl` | varchar | رابط الصورة |
| `link` | varchar | رابط خارجي |
| `category` | varchar | التصنيف |
| `sortOrder` | integer | ترتيب العرض |
| `createdAt` | timestamp | تاريخ الإنشاء |

---

## جدول رسائل التواصل - `contact_messages`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `profileId` | varchar | معرف الملف الشخصي المُستقبل |
| `senderName` | varchar | اسم المُرسل |
| `senderEmail` | varchar | بريد المُرسل |
| `message` | text | نص الرسالة |
| `isRead` | boolean | هل تمت قراءتها |
| `createdAt` | timestamp | تاريخ الإرسال |

---

## جدول الإشعارات - `notifications`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (indexed) | معرف المستخدم |
| `type` | varchar | النوع (invoice/contract/message/task) |
| `title` | varchar | العنوان |
| `message` | text | نص الإشعار |
| `link` | varchar | رابط الإشعار |
| `isRead` | boolean | هل تمت قراءته |
| `createdAt` | timestamp | تاريخ الإنشاء |

**الفهارس:** `userId`

---

## جدول الاشتراكات - `subscriptions`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (unique, indexed) | معرف المستخدم |
| `stripeCustomerId` | varchar (indexed) | معرف عميل Stripe |
| `stripeSubscriptionId` | varchar | معرف اشتراك Stripe |
| `stripePriceId` | varchar | معرف سعر Stripe |
| `plan` | varchar | الخطة (starter/pro/business) |
| `status` | varchar | الحالة (active/trialing/past_due/canceled/incomplete) |
| `currentPeriodStart` | timestamp | بداية الفترة الحالية |
| `currentPeriodEnd` | timestamp | نهاية الفترة الحالية |
| `cancelAtPeriodEnd` | boolean | هل سيُلغى نهاية الفترة |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

**الفهارس:** `userId`, `stripeCustomerId`

**السلوك:** يستخدم `onConflictDoUpdate` على `userId` (Upsert).

---

## جدول المستندات - `documents`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (indexed) | معرف المستخدم المالك |
| `clientId` | varchar | معرف العميل المرتبط |
| `title` | varchar | عنوان المستند |
| `docType` | varchar | نوع المستند (text/file) |
| `content` | text | المحتوى (HTML لمستندات النص) |
| `fileUrl` | varchar | رابط الملف (PDF/صورة) |
| `fileType` | varchar | نوع الملف (pdf/image) |
| `status` | varchar | الحالة (draft/sent/signed) |
| `shareToken` | varchar (unique, indexed) | توكن المشاركة للتوقيع |
| `recipientName` | varchar | اسم المستلم |
| `recipientEmail` | varchar | بريد المستلم |
| `signedAt` | timestamp | تاريخ التوقيع |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

**الفهارس:** `userId`, `shareToken`

**الحذف التتابعي:** عند حذف المستند تُحذف الحقول والتوقيعات.

---

## جدول حقول المستندات - `document_fields`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `documentId` | varchar | معرف المستند |
| `type` | varchar | نوع الحقل (text/date/signature) |
| `label` | varchar | التسمية |
| `value` | text | القيمة |
| `x` | decimal(10,4) | الموضع الأفقي |
| `y` | decimal(10,4) | الموضع الرأسي |
| `width` | decimal(10,4) | العرض |
| `height` | decimal(10,4) | الارتفاع |
| `page` | integer | رقم الصفحة |
| `required` | boolean | هل الحقل مطلوب |
| `sortOrder` | integer | ترتيب العرض |

---

## جدول التوقيعات الإلكترونية - `document_signatures`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `documentId` | varchar | معرف المستند |
| `signerName` | varchar | اسم الموقّع |
| `signerEmail` | varchar | بريد الموقّع |
| `signatureData` | text | بيانات التوقيع (PNG data URL) |
| `ipAddress` | varchar | عنوان IP |
| `signedAt` | timestamp | تاريخ التوقيع |

---

## جدول مكتبة المحتوى - `contentLibrary`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | varchar (PK) | UUID تلقائي |
| `userId` | varchar (indexed) | معرف المستخدم المالك |
| `title` | varchar | عنوان المحتوى |
| `content` | text | المحتوى (HTML) |
| `category` | varchar | التصنيف (general/contract/template) |
| `createdAt` | timestamp | تاريخ الإنشاء |
| `updatedAt` | timestamp | تاريخ التحديث |

**الاستخدام:** حفظ محتوى متكرر لإعادة إدراجه في محرر المستندات.

---

## ملاحظات عامة

### استراتيجية المعرفات
- جميع المعرفات UUID v4 عبر `gen_random_uuid()` في PostgreSQL
- نوع `varchar` (ليس `uuid` الأصلي)

### التحقق من البيانات
- مخططات Zod مُولّدة تلقائيًا من تعريفات Drizzle عبر `drizzle-zod`
- مشتركة بين العميل والسيرفر

### الترحيلات
- تُدار عبر `drizzle-kit push` (مزامنة مباشرة مع قاعدة البيانات)
- لا يوجد ملفات ترحيل SQL تقليدية
