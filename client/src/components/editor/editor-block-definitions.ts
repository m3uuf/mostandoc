import {
  Type, Heading1, Heading2, Heading3, Quote, Code,
  List, ListOrdered, CheckSquare,
  Table as TableIcon, Minus, Columns, SeparatorHorizontal,
  Image as ImageIcon, Video, Space, FileImage,
  PenTool, TextCursorInput, CalendarDays, CircleDot, ChevronDown,
  Receipt, Building2, Users, ScrollText, CreditCard, FileCheck,
  AlertTriangle, MousePointerClick, BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface EditorBlock {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  color?: string; // accent color for the block card
  getContent: () => string;
}

export interface EditorBlockCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  blocks: EditorBlock[];
}

export const EDITOR_BLOCK_CATEGORIES: EditorBlockCategory[] = [
  // ─── Content Blocks (like PandaDoc's content builder) ─────
  {
    id: "content",
    label: "المحتوى",
    icon: Type,
    blocks: [
      {
        id: "text",
        label: "نص",
        icon: Type,
        description: "كتلة نصية مع تنسيق كامل",
        color: "#3B82F6",
        getContent: () => "<p>اكتب نصك هنا...</p>",
      },
      {
        id: "h1",
        label: "عنوان رئيسي",
        icon: Heading1,
        description: "عنوان كبير H1",
        color: "#3B82F6",
        getContent: () => "<h1>عنوان رئيسي</h1>",
      },
      {
        id: "h2",
        label: "عنوان فرعي",
        icon: Heading2,
        description: "عنوان متوسط H2",
        color: "#3B82F6",
        getContent: () => "<h2>عنوان فرعي</h2>",
      },
      {
        id: "h3",
        label: "عنوان صغير",
        icon: Heading3,
        description: "عنوان صغير H3",
        color: "#3B82F6",
        getContent: () => "<h3>عنوان صغير</h3>",
      },
      {
        id: "image",
        label: "صورة",
        icon: ImageIcon,
        description: "إدراج صورة في المستند",
        color: "#8B5CF6",
        getContent: () =>
          '<p style="text-align:center;padding:3em 2em;border:2px dashed #d1d5db;border-radius:8px;color:#9ca3af;background:#fafafa">اسحب صورة هنا أو اضغط لرفع صورة</p>',
      },
      {
        id: "table",
        label: "جدول",
        icon: TableIcon,
        description: "جدول بيانات قابل للتعديل",
        color: "#10B981",
        getContent: () =>
          `<table><thead><tr><th>العمود 1</th><th>العمود 2</th><th>العمود 3</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table>`,
      },
      {
        id: "bulletList",
        label: "قائمة نقطية",
        icon: List,
        description: "قائمة بنقاط",
        color: "#3B82F6",
        getContent: () =>
          "<ul><li>عنصر أول</li><li>عنصر ثاني</li><li>عنصر ثالث</li></ul>",
      },
      {
        id: "orderedList",
        label: "قائمة مرقمة",
        icon: ListOrdered,
        description: "قائمة مرقمة بالترتيب",
        color: "#3B82F6",
        getContent: () =>
          "<ol><li>الخطوة الأولى</li><li>الخطوة الثانية</li><li>الخطوة الثالثة</li></ol>",
      },
      {
        id: "blockquote",
        label: "اقتباس",
        icon: Quote,
        description: "نص مقتبس مميز",
        color: "#F59E0B",
        getContent: () => "<blockquote><p>اكتب الاقتباس هنا...</p></blockquote>",
      },
      {
        id: "codeBlock",
        label: "كود",
        icon: Code,
        description: "كتلة أكواد برمجية",
        color: "#6366F1",
        getContent: () => '<pre class="code-block"><code>// اكتب الكود هنا</code></pre>',
      },
      {
        id: "hr",
        label: "فاصل أفقي",
        icon: Minus,
        description: "خط فاصل بين الأقسام",
        color: "#94A3B8",
        getContent: () => "<hr />",
      },
      {
        id: "spacer",
        label: "مسافة فارغة",
        icon: Space,
        description: "مسافة بين المحتوى",
        color: "#94A3B8",
        getContent: () => "<p>&nbsp;</p><p>&nbsp;</p>",
      },
      {
        id: "toc",
        label: "فهرس المحتوى",
        icon: BookOpen,
        description: "فهرس يُنشأ تلقائياً من العناوين",
        color: "#6366F1",
        getContent: () =>
          `<h2>فهرس المحتويات</h2><ol><li>القسم الأول</li><li>القسم الثاني</li><li>القسم الثالث</li></ol>`,
      },
    ],
  },

  // ─── Fillable Fields (like PandaDoc fields) ───────────────
  {
    id: "fields",
    label: "حقول التعبئة",
    icon: TextCursorInput,
    blocks: [
      {
        id: "signature",
        label: "توقيع",
        icon: PenTool,
        description: "حقل توقيع إلكتروني",
        color: "#10B981",
        getContent: () =>
          `<table><tbody><tr><td style="text-align:center;padding:2.5em 1em 0.5em;border-bottom:2px solid #000;width:50%"><span style="color:#9ca3af;font-size:0.85em">توقيع العميل</span></td><td style="width:2em"></td><td style="text-align:center;padding:2.5em 1em 0.5em;border-bottom:2px solid #000;width:50%"><span style="color:#9ca3af;font-size:0.85em">توقيع الشركة</span></td></tr></tbody></table>`,
      },
      {
        id: "textField",
        label: "حقل نص",
        icon: TextCursorInput,
        description: "حقل نصي قابل للتعبئة",
        color: "#3B82F6",
        getContent: () =>
          `<p><strong>الحقل:</strong> <span style="border-bottom:1px dashed #3B82F6;padding:2px 4em;color:#9ca3af">أدخل النص</span></p>`,
      },
      {
        id: "dateField",
        label: "تاريخ",
        icon: CalendarDays,
        description: "حقل تاريخ",
        color: "#F59E0B",
        getContent: () =>
          `<p><strong>التاريخ:</strong> <span style="border-bottom:1px dashed #F59E0B;padding:2px 2em;color:#9ca3af">يوم</span> / <span style="border-bottom:1px dashed #F59E0B;padding:2px 2em;color:#9ca3af">شهر</span> / <span style="border-bottom:1px dashed #F59E0B;padding:2px 3em;color:#9ca3af">سنة</span></p>`,
      },
      {
        id: "checkbox",
        label: "مربع اختيار",
        icon: CheckSquare,
        description: "خيار قابل للتحديد",
        color: "#10B981",
        getContent: () =>
          `<ul><li>الخيار الأول</li><li>الخيار الثاني</li><li>الخيار الثالث</li></ul>`,
      },
      {
        id: "initials",
        label: "أحرف أولى",
        icon: FileCheck,
        description: "حقل الأحرف الأولى من الاسم",
        color: "#8B5CF6",
        getContent: () =>
          `<p style="display:inline-block;border:2px solid #8B5CF6;border-radius:4px;padding:0.5em 1.5em;color:#9ca3af">الأحرف الأولى</p>`,
      },
    ],
  },

  // ─── Pricing (like PandaDoc pricing table) ────────────────
  {
    id: "pricing",
    label: "التسعير",
    icon: Receipt,
    blocks: [
      {
        id: "priceTable",
        label: "جدول أسعار",
        icon: Receipt,
        description: "جدول تسعير شامل للبنود والكميات",
        color: "#10B981",
        getContent: () =>
          `<h3>جدول الأسعار</h3><table><thead><tr><th>#</th><th>البند</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody><tr><td>1</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>2</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>3</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td><strong>المجموع</strong></td><td></td></tr></tbody></table>`,
      },
      {
        id: "paymentDetails",
        label: "تفاصيل الدفع",
        icon: CreditCard,
        description: "بيانات الحساب البنكي",
        color: "#F59E0B",
        getContent: () =>
          `<h3>تفاصيل الدفع</h3><table><tbody><tr><td><strong>البنك</strong></td><td>_______________</td></tr><tr><td><strong>رقم الحساب</strong></td><td>_______________</td></tr><tr><td><strong>IBAN</strong></td><td>_______________</td></tr></tbody></table>`,
      },
    ],
  },

  // ─── Document Sections (business templates) ───────────────
  {
    id: "sections",
    label: "أقسام المستند",
    icon: Columns,
    blocks: [
      {
        id: "companyHeader",
        label: "ترويسة الشركة",
        icon: Building2,
        description: "اسم وبيانات الشركة",
        color: "#3B5FE5",
        getContent: () =>
          `<h1 style="text-align:center;margin-bottom:0">اسم الشركة</h1><p style="text-align:center;color:#6b7280;margin-top:4px">العنوان | الهاتف: 05XXXXXXXX | البريد: info@company.com</p><hr />`,
      },
      {
        id: "clientInfo",
        label: "معلومات العميل",
        icon: Users,
        description: "بيانات العميل الأساسية",
        color: "#3B82F6",
        getContent: () =>
          `<h3>معلومات العميل</h3><table><tbody><tr><td style="width:120px"><strong>الاسم</strong></td><td>_______________</td></tr><tr><td><strong>الشركة</strong></td><td>_______________</td></tr><tr><td><strong>البريد</strong></td><td>_______________</td></tr><tr><td><strong>الهاتف</strong></td><td>_______________</td></tr><tr><td><strong>العنوان</strong></td><td>_______________</td></tr></tbody></table>`,
      },
      {
        id: "terms",
        label: "شروط وأحكام",
        icon: ScrollText,
        description: "الشروط والأحكام القانونية",
        color: "#EF4444",
        getContent: () =>
          `<h3>الشروط والأحكام</h3><ol><li>يلتزم الطرفان بتنفيذ بنود هذا العقد وفقاً لما ورد فيه.</li><li>مدة العقد _____ أيام تبدأ من تاريخ التوقيع.</li><li>يحق لأي طرف إنهاء العقد بإشعار خطي مسبق مدته 30 يوماً.</li></ol>`,
      },
      {
        id: "signatureBlock",
        label: "كتلة التوقيع",
        icon: PenTool,
        description: "قسم التوقيع النهائي مع التاريخ",
        color: "#10B981",
        getContent: () =>
          `<p>&nbsp;</p><table><tbody><tr><td style="width:50%;padding:1em"><strong>الطرف الأول</strong><p>&nbsp;</p><p>الاسم: _______________</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td><td style="width:50%;padding:1em"><strong>الطرف الثاني</strong><p>&nbsp;</p><p>الاسم: _______________</p><p>التوقيع: _______________</p><p>التاريخ: ____/____/________</p></td></tr></tbody></table>`,
      },
      {
        id: "note",
        label: "ملاحظة مهمة",
        icon: AlertTriangle,
        description: "ملاحظة أو تنبيه بارز",
        color: "#F59E0B",
        getContent: () =>
          `<blockquote><p><strong>ملاحظة مهمة:</strong> اكتب الملاحظة هنا. هذا القسم يلفت الانتباه لمعلومة مهمة.</p></blockquote>`,
      },
      {
        id: "cta",
        label: "دعوة لإجراء",
        icon: MousePointerClick,
        description: "زر أو رسالة لاتخاذ إجراء",
        color: "#3B5FE5",
        getContent: () =>
          '<p style="text-align:center;padding:1.5em 2em;background:linear-gradient(135deg,rgba(59,95,229,0.08),rgba(139,92,246,0.08));border-radius:8px;border:1px solid rgba(59,95,229,0.15)"><strong style="font-size:1.1em">اتخذ إجراء الآن</strong><br><span style="color:#6b7280">وصف الإجراء المطلوب من العميل</span></p>',
      },
    ],
  },
];

/** Find a block by its ID across all categories */
export function findBlockById(blockId: string): EditorBlock | undefined {
  for (const category of EDITOR_BLOCK_CATEGORIES) {
    const block = category.blocks.find((b) => b.id === blockId);
    if (block) return block;
  }
  return undefined;
}
