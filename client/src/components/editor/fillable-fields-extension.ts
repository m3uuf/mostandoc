import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Fillable Field TipTap Extension
 * Creates inline placeholder blocks for: signature, text, date, initials
 * In editor: shows as colored placeholder badges
 * In signing page: becomes interactive input fields
 */

export type FillableFieldType = "signature" | "text" | "date" | "initials";

export interface FillableFieldAttrs {
  fieldType: FillableFieldType;
  label: string;
  required: boolean;
  value: string;
}

const FIELD_CONFIG: Record<FillableFieldType, { emoji: string; defaultLabel: string; color: string }> = {
  signature: { emoji: "✍️", defaultLabel: "التوقيع", color: "#EF4444" },
  text: { emoji: "📝", defaultLabel: "حقل نص", color: "#3B82F6" },
  date: { emoji: "📅", defaultLabel: "التاريخ", color: "#F59E0B" },
  initials: { emoji: "🔤", defaultLabel: "الأحرف الأولى", color: "#8B5CF6" },
};

export const FillableFieldExtension = Node.create({
  name: "fillableField",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fieldType: { default: "text" },
      label: { default: "" },
      required: { default: true },
      value: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="fillableField"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const fieldType = HTMLAttributes.fieldType as FillableFieldType;
    const config = FIELD_CONFIG[fieldType] || FIELD_CONFIG.text;
    const label = HTMLAttributes.label || config.defaultLabel;
    const required = HTMLAttributes.required !== false;

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "fillableField",
        "data-field-type": fieldType,
        "data-label": label,
        "data-required": required ? "true" : "false",
        class: "fillable-field",
        style: `border: 2px dashed ${config.color}40; background: ${config.color}08; border-radius: 8px; padding: 12px 16px; margin: 8px 0; display: flex; align-items: center; gap: 8px; direction: rtl;`,
      }),
      [
        "span",
        {
          style: `display: inline-flex; align-items: center; gap: 6px; color: ${config.color}; font-size: 13px; font-weight: 500;`,
        },
        `${config.emoji} ${label}${required ? " *" : ""}`,
      ],
    ];
  },

  addCommands() {
    return {
      insertFillableField:
        (attrs: Partial<FillableFieldAttrs>) =>
        ({ commands }: { commands: any }) => {
          const fieldType = attrs.fieldType || "text";
          const config = FIELD_CONFIG[fieldType];
          return commands.insertContent({
            type: this.name,
            attrs: {
              fieldType,
              label: attrs.label || config?.defaultLabel || "حقل",
              required: attrs.required ?? true,
              value: attrs.value || "",
            },
          });
        },
    } as any;
  },
});

export { FIELD_CONFIG };

/**
 * Extract fillable fields from HTML content for the signing page
 */
export function extractFillableFields(html: string): FillableFieldAttrs[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = doc.querySelectorAll('[data-type="fillableField"]');
  const fields: FillableFieldAttrs[] = [];
  nodes.forEach((node, index) => {
    fields.push({
      fieldType: (node.getAttribute("data-field-type") as FillableFieldType) || "text",
      label: node.getAttribute("data-label") || `حقل ${index + 1}`,
      required: node.getAttribute("data-required") !== "false",
      value: "",
    });
  });
  return fields;
}

/**
 * Replace fillable field placeholders in HTML with filled values
 */
export function fillFieldsInHtml(
  html: string,
  values: Record<number, string>,
  signatureDataUrl?: string
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = doc.querySelectorAll('[data-type="fillableField"]');
  nodes.forEach((node, index) => {
    const fieldType = node.getAttribute("data-field-type");
    const label = node.getAttribute("data-label") || "";
    const value = values[index] || "";

    const div = doc.createElement("div");
    div.style.cssText = "margin: 8px 0; padding: 8px 0;";

    if (fieldType === "signature" && signatureDataUrl) {
      div.innerHTML = `
        <div style="margin-bottom:4px;font-size:12px;color:#6b7280;font-weight:500;">${label}:</div>
        <img src="${signatureDataUrl}" style="max-width:250px;max-height:100px;" />
      `;
    } else if (fieldType === "date") {
      div.innerHTML = `
        <span style="font-size:12px;color:#6b7280;">${label}:</span>
        <span style="font-weight:500;margin-right:8px;">${value || new Date().toLocaleDateString("ar-SA")}</span>
      `;
    } else {
      div.innerHTML = `
        <span style="font-size:12px;color:#6b7280;">${label}:</span>
        <span style="font-weight:500;margin-right:8px;border-bottom:1px solid #374151;padding-bottom:2px;">${value}</span>
      `;
    }

    node.replaceWith(div);
  });

  return doc.body.innerHTML;
}
