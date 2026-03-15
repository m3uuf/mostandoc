import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@resend.dev";
const FROM_NAME = "مستندك";
const APP_URL = process.env.APP_URL || "https://app.mostandoc.com";

// ─── Base layout ─────────────────────────────────────────────────
function layout(content: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Tajawal',Tahoma,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
${content}
<!-- Footer -->
<tr><td style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #E5E7EB;">
  ${footerNote ? `<p style="font-size:13px;color:#6B7280;margin:0 0 8px;">${footerNote}</p>` : ""}
  <p style="font-size:13px;color:#9CA3AF;margin:0 0 4px;">مستندك — سجّل مرة واحدة وأدِر كل أعمالك</p>
  <p style="font-size:12px;color:#9CA3AF;margin:0;">© ${new Date().getFullYear()} مستندك. جميع الحقوق محفوظة.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function header(title: string, gradient = "linear-gradient(135deg,#E8752A,#F5943E)"): string {
  return `<tr><td style="background:${gradient};padding:40px 40px 30px;text-align:center;">
  <img src="${APP_URL}/favicon.png" alt="مستندك" width="56" height="56" style="border-radius:14px;margin-bottom:12px;" />
  <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0;font-family:'Tajawal',sans-serif;">${title}</h1>
</td></tr>`;
}

function button(text: string, url: string, color = "#E8752A"): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
<tr><td align="center">
  <a href="${url}" style="display:inline-block;background:${color};color:#fff;font-size:17px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:100px;font-family:'Tajawal',sans-serif;">${text}</a>
</td></tr></table>`;
}

function body(html: string): string {
  return `<tr><td style="padding:36px 40px;">${html}</td></tr>`;
}

function greeting(name: string): string {
  return `<p style="font-size:17px;color:#1A1A2E;font-weight:700;margin:0 0 16px;">أهلاً ${name}! 👋</p>`;
}

function paragraph(text: string): string {
  return `<p style="font-size:15px;color:#1F2937;line-height:1.8;margin:0 0 16px;">${text}</p>`;
}

function note(text: string): string {
  return `<p style="font-size:13px;color:#9CA3AF;margin:16px 0 0;">${text}</p>`;
}

// ─── Send helper ─────────────────────────────────────────────────
async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: `${FROM_NAME} <${FROM}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`Email send error (${subject}):`, err);
  }
}

// ─── Email templates ─────────────────────────────────────────────

/** 1. Email verification */
export async function sendVerificationEmail(to: string, name: string, verifyUrl: string) {
  const html = layout(
    header("تفعيل البريد الإلكتروني ✦") +
    body(
      greeting(name || "عزيزي المستخدم") +
      paragraph("شكراً لتسجيلك في مستندك! اضغط على الزر أدناه لتفعيل بريدك الإلكتروني:") +
      button("تفعيل البريد الإلكتروني ←", verifyUrl) +
      note("هذا الرابط صالح لمدة 24 ساعة. إذا لم تقم بإنشاء حساب، تجاهل هذه الرسالة.")
    )
  );
  await send(to, "✦ تفعيل بريدك الإلكتروني — مستندك", html);
}

/** 2. Password reset */
export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const html = layout(
    header("إعادة تعيين كلمة المرور", "linear-gradient(135deg,#3B5FE5,#2A45B0)") +
    body(
      greeting(name || "عزيزي المستخدم") +
      paragraph("لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. اضغط على الزر أدناه:") +
      button("إعادة تعيين كلمة المرور ←", resetUrl, "#3B5FE5") +
      note("هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة.")
    )
  );
  await send(to, "🔒 إعادة تعيين كلمة المرور — مستندك", html);
}

/** 3. Welcome email (after registration) */
export async function sendWelcomeEmail(to: string, name: string) {
  const html = layout(
    header("مرحبًا بك في مستندك ✦") +
    body(
      greeting(name) +
      paragraph("يسعدنا انضمامك لمستندك — المنصة العربية المتكاملة لإدارة أعمالك. كل شي تحتاجه في مكان واحد.") +
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:#FFF8F3;border-radius:12px;padding:16px;width:48%;vertical-align:top;">
            <p style="font-size:20px;margin:0 0 6px;">💼</p>
            <p style="font-size:14px;color:#1A1A2E;font-weight:700;margin:0 0 4px;">إدارة العملاء</p>
            <p style="font-size:12px;color:#6B7280;margin:0;">تابع عملاءك بسهولة</p>
          </td>
          <td width="4%"></td>
          <td style="background:#FFF8F3;border-radius:12px;padding:16px;width:48%;vertical-align:top;">
            <p style="font-size:20px;margin:0 0 6px;">📄</p>
            <p style="font-size:14px;color:#1A1A2E;font-weight:700;margin:0 0 4px;">فواتير وعقود</p>
            <p style="font-size:12px;color:#6B7280;margin:0;">أنشئ ووقّع إلكترونياً</p>
          </td>
        </tr>
        <tr><td colspan="3" height="8"></td></tr>
        <tr>
          <td style="background:#FFF8F3;border-radius:12px;padding:16px;width:48%;vertical-align:top;">
            <p style="font-size:20px;margin:0 0 6px;">📊</p>
            <p style="font-size:14px;color:#1A1A2E;font-weight:700;margin:0 0 4px;">إدارة المشاريع</p>
            <p style="font-size:12px;color:#6B7280;margin:0;">تتبع التقدم والميزانيات</p>
          </td>
          <td width="4%"></td>
          <td style="background:#FFF8F3;border-radius:12px;padding:16px;width:48%;vertical-align:top;">
            <p style="font-size:20px;margin:0 0 6px;">✦</p>
            <p style="font-size:14px;color:#1A1A2E;font-weight:700;margin:0 0 4px;">مساعد ذكي</p>
            <p style="font-size:12px;color:#6B7280;margin:0;">ذكاء اصطناعي يساعدك</p>
          </td>
        </tr>
      </table>` +
      button("ابدأ الآن ←", `${APP_URL}/dashboard`)
    )
  );
  await send(to, "✦ مرحبًا بك في مستندك!", html);
}

/** 4. Document signing request */
export async function sendSigningRequestEmail(
  to: string,
  recipientName: string,
  senderName: string,
  docTitle: string,
  signUrl: string
) {
  const html = layout(
    header("طلب توقيع مستند ✍️", "linear-gradient(135deg,#3B5FE5,#2A45B0)") +
    body(
      greeting(recipientName || "عزيزي") +
      paragraph(`قام <strong>${senderName}</strong> بإرسال مستند بعنوان <strong>"${docTitle}"</strong> ويطلب توقيعك عليه.`) +
      button("عرض وتوقيع المستند ←", signUrl, "#3B5FE5") +
      `<p style="font-size:12px;color:#9CA3AF;text-align:center;margin:16px 0 0;">
        أو انسخ الرابط: <a href="${signUrl}" style="color:#3B5FE5;word-break:break-all;">${signUrl}</a>
      </p>`
    ),
    "هذا البريد مرسل تلقائياً من منصة مستندك"
  );
  await send(to, `✍️ ${senderName} يطلب توقيعك على: ${docTitle}`, html);
}

/** 5. Signature confirmation (sent to both parties) */
export async function sendSignatureConfirmationEmail(
  to: string,
  name: string,
  docTitle: string,
  signerName: string,
  signedDate: string
) {
  const html = layout(
    header("تم التوقيع بنجاح ✅") +
    body(
      greeting(name || "عزيزي") +
      paragraph(`تم توقيع المستند <strong>"${docTitle}"</strong> بنجاح.`) +
      `<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F3;border-radius:12px;padding:20px;margin:16px 0 24px;">
        <tr><td>
          <p style="font-size:14px;color:#6B7280;margin:0 0 8px;">📝 <strong style="color:#1A1A2E;">المستند:</strong> ${docTitle}</p>
          <p style="font-size:14px;color:#6B7280;margin:0 0 8px;">✍️ <strong style="color:#1A1A2E;">الموقّع:</strong> ${signerName}</p>
          <p style="font-size:14px;color:#6B7280;margin:0;">📅 <strong style="color:#1A1A2E;">التاريخ:</strong> ${signedDate}</p>
        </td></tr>
      </table>` +
      button("عرض المستند ←", `${APP_URL}/dashboard/documents`)
    )
  );
  await send(to, `✅ تم توقيع المستند: ${docTitle}`, html);
}

/** 6. Invoice email to client */
export async function sendInvoiceEmail(
  to: string,
  clientName: string,
  senderName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  viewUrl?: string
) {
  const html = layout(
    header("فاتورة جديدة 📄") +
    body(
      greeting(clientName || "عزيزي العميل") +
      paragraph(`أرسل لك <strong>${senderName}</strong> فاتورة جديدة.`) +
      `<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F3;border-radius:12px;padding:20px;margin:16px 0 24px;">
        <tr><td>
          <p style="font-size:14px;color:#6B7280;margin:0 0 8px;">🔢 <strong style="color:#1A1A2E;">رقم الفاتورة:</strong> ${invoiceNumber}</p>
          <p style="font-size:14px;color:#6B7280;margin:0 0 8px;">💰 <strong style="color:#1A1A2E;">المبلغ:</strong> <span style="color:#E8752A;font-weight:700;font-size:18px;">${amount}</span></p>
          <p style="font-size:14px;color:#6B7280;margin:0;">📅 <strong style="color:#1A1A2E;">تاريخ الاستحقاق:</strong> ${dueDate}</p>
        </td></tr>
      </table>` +
      (viewUrl ? button("عرض الفاتورة ←", viewUrl) : "") +
      note("هذه الفاتورة مرسلة تلقائياً من منصة مستندك.")
    ),
    `مرسلة بواسطة ${senderName} عبر مستندك`
  );
  await send(to, `📄 فاتورة جديدة من ${senderName} — #${invoiceNumber}`, html);
}
