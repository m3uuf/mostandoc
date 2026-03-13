import {
  FileText, Briefcase, Handshake, UserCheck,
  ClipboardList, FileSignature, ShieldCheck,
  ReceiptText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface EditorTemplate {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  color: string;
  category: "contract" | "document" | "proposal";
  getContent: () => string;
}

export const EDITOR_TEMPLATES: EditorTemplate[] = [
  // ─── Contract Templates ───────────────────────────────────
  {
    id: "service-contract",
    label: "عقد تقديم خدمات",
    icon: Handshake,
    description: "عقد شامل لتقديم خدمات بين طرفين",
    color: "#3B5FE5",
    category: "contract",
    getContent: () => `
<h1 style="text-align:center">عقد تقديم خدمات</h1>
<p style="text-align:center;color:#6b7280">رقم العقد: _______________</p>
<hr />

<p>تم الاتفاق في هذا اليوم الموافق <span style="border-bottom:1px dashed #3B82F6;padding:2px 3em;color:#9ca3af">التاريخ</span> بين كل من:</p>

<h3>الطرف الأول (مقدم الخدمة)</h3>
<table><tbody>
<tr><td style="width:120px"><strong>الاسم</strong></td><td>_______________</td></tr>
<tr><td><strong>السجل التجاري</strong></td><td>_______________</td></tr>
<tr><td><strong>العنوان</strong></td><td>_______________</td></tr>
<tr><td><strong>الهاتف</strong></td><td>_______________</td></tr>
</tbody></table>

<h3>الطرف الثاني (العميل)</h3>
<table><tbody>
<tr><td style="width:120px"><strong>الاسم</strong></td><td>_______________</td></tr>
<tr><td><strong>السجل التجاري</strong></td><td>_______________</td></tr>
<tr><td><strong>العنوان</strong></td><td>_______________</td></tr>
<tr><td><strong>الهاتف</strong></td><td>_______________</td></tr>
</tbody></table>

<h2>المادة الأولى - نطاق العمل</h2>
<p>يقوم الطرف الأول بتقديم الخدمات التالية للطرف الثاني:</p>
<ol>
<li>_______________</li>
<li>_______________</li>
<li>_______________</li>
</ol>

<h2>المادة الثانية - المقابل المالي</h2>
<table><thead><tr><th>البند</th><th>الوصف</th><th>المبلغ</th></tr></thead><tbody>
<tr><td>1</td><td></td><td></td></tr>
<tr><td>2</td><td></td><td></td></tr>
<tr><td></td><td><strong>الإجمالي</strong></td><td><strong></strong></td></tr>
</tbody></table>

<h2>المادة الثالثة - مدة العقد</h2>
<p>يبدأ هذا العقد من تاريخ <span style="border-bottom:1px dashed #F59E0B;padding:2px 3em;color:#9ca3af">البداية</span> وينتهي بتاريخ <span style="border-bottom:1px dashed #F59E0B;padding:2px 3em;color:#9ca3af">النهاية</span>.</p>

<h2>المادة الرابعة - الالتزامات</h2>
<p><strong>التزامات الطرف الأول:</strong></p>
<ul>
<li>تقديم الخدمات وفقاً للمعايير المتفق عليها.</li>
<li>الالتزام بالجدول الزمني المحدد.</li>
<li>الحفاظ على سرية المعلومات.</li>
</ul>

<p><strong>التزامات الطرف الثاني:</strong></p>
<ul>
<li>سداد المستحقات في المواعيد المحددة.</li>
<li>توفير المعلومات والمواد اللازمة.</li>
<li>التعاون مع الطرف الأول لإنجاز العمل.</li>
</ul>

<h2>المادة الخامسة - شروط الإنهاء</h2>
<ol>
<li>يحق لأي طرف إنهاء العقد بإشعار كتابي مدته 30 يوماً.</li>
<li>في حالة الإخلال بالشروط، يحق للطرف المتضرر إنهاء العقد فوراً.</li>
<li>يستحق الطرف الأول أتعاب الأعمال المنجزة حتى تاريخ الإنهاء.</li>
</ol>

<h2>المادة السادسة - السرية</h2>
<p>يلتزم الطرفان بعدم إفشاء أي معلومات سرية تم تبادلها خلال سريان هذا العقد أو بعد انتهائه.</p>

<h2>المادة السابعة - القانون واجب التطبيق</h2>
<p>يخضع هذا العقد لأنظمة المملكة العربية السعودية، ويتم حل أي نزاع بالطرق الودية أولاً، فإن تعذر ذلك يُحال إلى الجهات القضائية المختصة.</p>

<p>&nbsp;</p>

<table><tbody>
<tr>
<td style="width:50%;padding:1em;text-align:center"><strong>الطرف الأول</strong><p>&nbsp;</p><p>الاسم: _______________</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td>
<td style="width:50%;padding:1em;text-align:center"><strong>الطرف الثاني</strong><p>&nbsp;</p><p>الاسم: _______________</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td>
</tr>
</tbody></table>
`.trim(),
  },

  {
    id: "project-contract",
    label: "عقد تنفيذ مشروع",
    icon: Briefcase,
    description: "عقد لتنفيذ مشروع محدد مع مراحل ودفعات",
    color: "#10B981",
    category: "contract",
    getContent: () => `
<h1 style="text-align:center">عقد تنفيذ مشروع</h1>
<p style="text-align:center;color:#6b7280">رقم العقد: _______________</p>
<hr />

<p>أُبرم هذا العقد بتاريخ <span style="border-bottom:1px dashed #3B82F6;padding:2px 3em;color:#9ca3af">التاريخ</span> بين:</p>

<h3>الطرف الأول (العميل)</h3>
<table><tbody>
<tr><td style="width:120px"><strong>الاسم</strong></td><td>_______________</td></tr>
<tr><td><strong>الشركة</strong></td><td>_______________</td></tr>
<tr><td><strong>الهاتف</strong></td><td>_______________</td></tr>
</tbody></table>

<h3>الطرف الثاني (المنفذ)</h3>
<table><tbody>
<tr><td style="width:120px"><strong>الاسم</strong></td><td>_______________</td></tr>
<tr><td><strong>الشركة</strong></td><td>_______________</td></tr>
<tr><td><strong>الهاتف</strong></td><td>_______________</td></tr>
</tbody></table>

<h2>المادة الأولى - وصف المشروع</h2>
<p>يتعهد الطرف الثاني بتنفيذ المشروع التالي:</p>
<blockquote><p>وصف تفصيلي للمشروع ونطاق العمل المطلوب...</p></blockquote>

<h2>المادة الثانية - المراحل والتسليمات</h2>
<table><thead><tr><th>#</th><th>المرحلة</th><th>التسليمات</th><th>المدة</th></tr></thead><tbody>
<tr><td>1</td><td>التخطيط والتحليل</td><td></td><td></td></tr>
<tr><td>2</td><td>التصميم</td><td></td><td></td></tr>
<tr><td>3</td><td>التنفيذ والتطوير</td><td></td><td></td></tr>
<tr><td>4</td><td>الاختبار والتسليم</td><td></td><td></td></tr>
</tbody></table>

<h2>المادة الثالثة - الجدول الزمني</h2>
<ul>
<li><strong>تاريخ البدء:</strong> _______________</li>
<li><strong>تاريخ التسليم النهائي:</strong> _______________</li>
<li><strong>فترة الضمان:</strong> _______________ يوم من تاريخ التسليم</li>
</ul>

<h2>المادة الرابعة - المقابل المالي والدفعات</h2>
<p><strong>إجمالي قيمة المشروع:</strong> _______________ ريال سعودي</p>
<table><thead><tr><th>الدفعة</th><th>النسبة</th><th>المبلغ</th><th>الاستحقاق</th></tr></thead><tbody>
<tr><td>دفعة مقدمة</td><td>30%</td><td></td><td>عند التوقيع</td></tr>
<tr><td>دفعة ثانية</td><td>40%</td><td></td><td>عند اكتمال 50%</td></tr>
<tr><td>الدفعة النهائية</td><td>30%</td><td></td><td>عند التسليم</td></tr>
</tbody></table>

<h2>المادة الخامسة - شروط عامة</h2>
<ol>
<li>يلتزم الطرف الثاني بتنفيذ المشروع وفقاً للمواصفات المتفق عليها.</li>
<li>أي تعديلات على نطاق العمل تتطلب موافقة كتابية من الطرفين.</li>
<li>يحتفظ الطرف الأول بحقوق الملكية الفكرية بعد السداد الكامل.</li>
</ol>

<p>&nbsp;</p>

<table><tbody>
<tr>
<td style="width:50%;padding:1em;text-align:center"><strong>الطرف الأول (العميل)</strong><p>&nbsp;</p><p>الاسم: _______________</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td>
<td style="width:50%;padding:1em;text-align:center"><strong>الطرف الثاني (المنفذ)</strong><p>&nbsp;</p><p>الاسم: _______________</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td>
</tr>
</tbody></table>
`.trim(),
  },

  {
    id: "consulting-contract",
    label: "عقد استشارات",
    icon: UserCheck,
    description: "عقد تقديم استشارات مهنية",
    color: "#8B5CF6",
    category: "contract",
    getContent: () => `
<h1 style="text-align:center">عقد تقديم استشارات</h1>
<hr />

<p>تم الاتفاق بين:</p>
<p><strong>الطرف الأول:</strong> _______________</p>
<p><strong>الطرف الثاني (المستشار):</strong> _______________</p>

<h2>المادة الأولى - نطاق الاستشارة</h2>
<p>يقدم المستشار خدماته الاستشارية في مجال:</p>
<blockquote><p>وصف مجال الاستشارة والأهداف المرجوة...</p></blockquote>

<h2>المادة الثانية - الأتعاب</h2>
<table><tbody>
<tr><td><strong>سعر الساعة</strong></td><td>_______________ ريال</td></tr>
<tr><td><strong>الحد الأقصى للساعات</strong></td><td>_______________ ساعة</td></tr>
<tr><td><strong>الإجمالي التقديري</strong></td><td>_______________ ريال</td></tr>
</tbody></table>

<h2>المادة الثالثة - السرية</h2>
<p>يلتزم المستشار بعدم إفشاء أي معلومات سرية تتعلق بأعمال الطرف الأول خلال فترة العقد وبعد انتهائه بمدة لا تقل عن سنتين.</p>

<h2>المادة الرابعة - المدة</h2>
<p>من <span style="border-bottom:1px dashed #F59E0B;padding:2px 3em;color:#9ca3af">البداية</span> إلى <span style="border-bottom:1px dashed #F59E0B;padding:2px 3em;color:#9ca3af">النهاية</span>.</p>

<p>&nbsp;</p>

<table><tbody>
<tr>
<td style="width:50%;padding:1em;text-align:center"><strong>الطرف الأول</strong><p>&nbsp;</p><p>التوقيع: _______________</p></td>
<td style="width:50%;padding:1em;text-align:center"><strong>المستشار</strong><p>&nbsp;</p><p>التوقيع: _______________</p></td>
</tr>
</tbody></table>
`.trim(),
  },

  {
    id: "nda",
    label: "اتفاقية سرية",
    icon: ShieldCheck,
    description: "اتفاقية عدم إفشاء المعلومات السرية (NDA)",
    color: "#EF4444",
    category: "contract",
    getContent: () => `
<h1 style="text-align:center">اتفاقية عدم إفشاء</h1>
<p style="text-align:center;color:#6b7280">(اتفاقية السرية - NDA)</p>
<hr />

<p>أُبرمت هذه الاتفاقية بتاريخ _______________ بين:</p>

<p><strong>الطرف المُفصح:</strong> _______________</p>
<p><strong>الطرف المُتلقي:</strong> _______________</p>

<h2>المادة الأولى - تعريف المعلومات السرية</h2>
<p>تشمل المعلومات السرية بموجب هذه الاتفاقية جميع المعلومات التجارية والفنية والمالية التي يفصح عنها أي طرف للطرف الآخر، سواء كانت مكتوبة أو شفهية أو إلكترونية.</p>

<h2>المادة الثانية - الالتزامات</h2>
<ol>
<li>عدم إفشاء المعلومات السرية لأي طرف ثالث.</li>
<li>استخدام المعلومات فقط للغرض المحدد في هذه الاتفاقية.</li>
<li>اتخاذ جميع الإجراءات اللازمة لحماية سرية المعلومات.</li>
<li>إعادة جميع المواد والنسخ عند انتهاء الاتفاقية.</li>
</ol>

<h2>المادة الثالثة - المدة</h2>
<p>تسري هذه الاتفاقية لمدة <strong>_____ سنوات</strong> من تاريخ التوقيع.</p>

<h2>المادة الرابعة - الاستثناءات</h2>
<p>لا تشمل المعلومات السرية ما يلي:</p>
<ul>
<li>معلومات متاحة للعموم بشكل مشروع.</li>
<li>معلومات حصل عليها الطرف المتلقي من مصدر مستقل.</li>
<li>معلومات يُطلب الإفصاح عنها بموجب القانون.</li>
</ul>

<p>&nbsp;</p>

<table><tbody>
<tr>
<td style="width:50%;padding:1em;text-align:center"><strong>الطرف المُفصح</strong><p>&nbsp;</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td>
<td style="width:50%;padding:1em;text-align:center"><strong>الطرف المُتلقي</strong><p>&nbsp;</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td>
</tr>
</tbody></table>
`.trim(),
  },

  // ─── Document Templates ───────────────────────────────────
  {
    id: "proposal",
    label: "عرض سعر",
    icon: ReceiptText,
    description: "عرض سعر احترافي مع تفاصيل الخدمات والأسعار",
    color: "#F59E0B",
    category: "proposal",
    getContent: () => `
<h1 style="text-align:center">عرض سعر</h1>
<p style="text-align:center;color:#6b7280">رقم العرض: _______________ | التاريخ: _______________</p>
<hr />

<h3>من:</h3>
<table><tbody>
<tr><td style="width:100px"><strong>الشركة</strong></td><td>_______________</td></tr>
<tr><td><strong>البريد</strong></td><td>_______________</td></tr>
<tr><td><strong>الهاتف</strong></td><td>_______________</td></tr>
</tbody></table>

<h3>إلى:</h3>
<table><tbody>
<tr><td style="width:100px"><strong>العميل</strong></td><td>_______________</td></tr>
<tr><td><strong>الشركة</strong></td><td>_______________</td></tr>
</tbody></table>

<h2>وصف الخدمات</h2>
<p>نقدم لكم عرض السعر التالي للخدمات المطلوبة:</p>

<table><thead><tr><th>#</th><th>البند</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>
<tr><td>1</td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td>2</td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td>3</td><td></td><td></td><td></td><td></td><td></td></tr>
<tr><td></td><td></td><td></td><td></td><td><strong>المجموع</strong></td><td><strong></strong></td></tr>
<tr><td></td><td></td><td></td><td></td><td><strong>الضريبة 15%</strong></td><td><strong></strong></td></tr>
<tr><td></td><td></td><td></td><td></td><td><strong>الإجمالي</strong></td><td><strong></strong></td></tr>
</tbody></table>

<h2>الشروط</h2>
<ul>
<li><strong>صلاحية العرض:</strong> 15 يوم من تاريخ الإصدار.</li>
<li><strong>طريقة الدفع:</strong> 50% مقدم + 50% عند التسليم.</li>
<li><strong>مدة التنفيذ:</strong> _______________ يوم عمل.</li>
</ul>

<p style="text-align:center;padding:1.5em;background:rgba(59,95,229,0.06);border-radius:8px;margin-top:2em">
<strong>للموافقة على العرض، يرجى التوقيع أدناه وإعادته</strong>
</p>

<p>&nbsp;</p>
<table><tbody>
<tr>
<td style="width:50%;padding:1em;text-align:center"><strong>مقدم العرض</strong><p>&nbsp;</p><p>التوقيع: _______________</p></td>
<td style="width:50%;padding:1em;text-align:center"><strong>موافقة العميل</strong><p>&nbsp;</p><p>التوقيع: _______________</p></td>
</tr>
</tbody></table>
`.trim(),
  },

  {
    id: "meeting-notes",
    label: "محضر اجتماع",
    icon: ClipboardList,
    description: "نموذج محضر اجتماع رسمي",
    color: "#6366F1",
    category: "document",
    getContent: () => `
<h1 style="text-align:center">محضر اجتماع</h1>
<hr />

<table><tbody>
<tr><td style="width:120px"><strong>التاريخ</strong></td><td>_______________</td><td style="width:120px"><strong>الوقت</strong></td><td>_______________</td></tr>
<tr><td><strong>المكان</strong></td><td>_______________</td><td><strong>المدة</strong></td><td>_______________</td></tr>
</tbody></table>

<h2>الحضور</h2>
<ol>
<li>_______________</li>
<li>_______________</li>
<li>_______________</li>
</ol>

<h2>جدول الأعمال</h2>
<ol>
<li>_______________</li>
<li>_______________</li>
<li>_______________</li>
</ol>

<h2>ملخص النقاش</h2>
<p>_______________</p>

<h2>القرارات والتوصيات</h2>
<table><thead><tr><th>#</th><th>القرار</th><th>المسؤول</th><th>الموعد النهائي</th></tr></thead><tbody>
<tr><td>1</td><td></td><td></td><td></td></tr>
<tr><td>2</td><td></td><td></td><td></td></tr>
<tr><td>3</td><td></td><td></td><td></td></tr>
</tbody></table>

<h2>الاجتماع القادم</h2>
<p><strong>التاريخ:</strong> _______________ | <strong>الوقت:</strong> _______________</p>

<p>&nbsp;</p>
<p><strong>تحرر بمعرفة:</strong> _______________</p>
`.trim(),
  },

  {
    id: "invoice-doc",
    label: "فاتورة",
    icon: FileSignature,
    description: "فاتورة احترافية مع تفاصيل الخدمات",
    color: "#10B981",
    category: "document",
    getContent: () => `
<h1 style="text-align:center">فاتورة</h1>
<p style="text-align:center;color:#6b7280">رقم الفاتورة: _______________ | التاريخ: _______________</p>
<hr />

<table><tbody>
<tr><td style="width:50%;vertical-align:top;padding:1em"><h3>من:</h3><p><strong>_______________</strong></p><p>_______________</p><p>الرقم الضريبي: _______________</p></td>
<td style="width:50%;vertical-align:top;padding:1em"><h3>إلى:</h3><p><strong>_______________</strong></p><p>_______________</p></td></tr>
</tbody></table>

<table><thead><tr><th>#</th><th>الخدمة / المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>
<tr><td>1</td><td></td><td></td><td></td><td></td></tr>
<tr><td>2</td><td></td><td></td><td></td><td></td></tr>
<tr><td>3</td><td></td><td></td><td></td><td></td></tr>
<tr><td></td><td></td><td></td><td><strong>المجموع</strong></td><td></td></tr>
<tr><td></td><td></td><td></td><td><strong>ضريبة القيمة المضافة 15%</strong></td><td></td></tr>
<tr><td></td><td></td><td></td><td><strong>الإجمالي المستحق</strong></td><td><strong></strong></td></tr>
</tbody></table>

<h3>تفاصيل الدفع</h3>
<table><tbody>
<tr><td style="width:120px"><strong>البنك</strong></td><td>_______________</td></tr>
<tr><td><strong>رقم الحساب</strong></td><td>_______________</td></tr>
<tr><td><strong>IBAN</strong></td><td>_______________</td></tr>
</tbody></table>

<blockquote><p><strong>ملاحظة:</strong> يرجى السداد خلال 30 يوم من تاريخ الفاتورة.</p></blockquote>
`.trim(),
  },

  {
    id: "blank",
    label: "مستند فارغ",
    icon: FileText,
    description: "مستند فارغ مع ترويسة الشركة",
    color: "#94A3B8",
    category: "document",
    getContent: () => `
<h1 style="text-align:center">اسم الشركة</h1>
<p style="text-align:center;color:#6b7280">العنوان | الهاتف | البريد الإلكتروني</p>
<hr />

<p>&nbsp;</p>
<p>اكتب محتوى المستند هنا...</p>
`.trim(),
  },
];

export function getTemplateById(templateId: string): EditorTemplate | undefined {
  return EDITOR_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplatesByCategory(category: EditorTemplate["category"]): EditorTemplate[] {
  return EDITOR_TEMPLATES.filter((t) => t.category === category);
}
