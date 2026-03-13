import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

/**
 * Available smart variable definitions
 */
export interface SmartVariableDefinition {
  name: string;
  label: string;
  group: "client" | "company" | "document";
  groupLabel: string;
}

export const SMART_VARIABLES: SmartVariableDefinition[] = [
  // Client
  { name: "اسم_العميل", label: "اسم العميل", group: "client", groupLabel: "بيانات العميل" },
  { name: "بريد_العميل", label: "بريد العميل", group: "client", groupLabel: "بيانات العميل" },
  { name: "هاتف_العميل", label: "هاتف العميل", group: "client", groupLabel: "بيانات العميل" },
  { name: "شركة_العميل", label: "شركة العميل", group: "client", groupLabel: "بيانات العميل" },
  // Company
  { name: "اسم_الشركة", label: "اسم الشركة", group: "company", groupLabel: "بيانات الشركة" },
  { name: "عنوان_الشركة", label: "عنوان الشركة", group: "company", groupLabel: "بيانات الشركة" },
  { name: "هاتف_الشركة", label: "هاتف الشركة", group: "company", groupLabel: "بيانات الشركة" },
  // Document
  { name: "تاريخ_اليوم", label: "تاريخ اليوم", group: "document", groupLabel: "بيانات المستند" },
  { name: "رقم_المستند", label: "رقم المستند", group: "document", groupLabel: "بيانات المستند" },
];

/**
 * Resolve variable values from context data
 */
export function resolveVariableValue(
  name: string,
  context: {
    client?: { name?: string; email?: string; phone?: string; company?: string };
    profile?: { company?: string; address?: string; phone?: string };
    documentId?: string;
  }
): string | null {
  const { client, profile, documentId } = context;
  switch (name) {
    case "اسم_العميل": return client?.name || null;
    case "بريد_العميل": return client?.email || null;
    case "هاتف_العميل": return client?.phone || null;
    case "شركة_العميل": return client?.company || null;
    case "اسم_الشركة": return profile?.company || null;
    case "عنوان_الشركة": return profile?.address || null;
    case "هاتف_الشركة": return profile?.phone || null;
    case "تاريخ_اليوم":
      return new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
    case "رقم_المستند": return documentId || null;
    default: return null;
  }
}

/**
 * Replace all smart variable nodes in HTML with their resolved values.
 * Used for PDF export and signing view.
 */
export function resolveVariablesInHtml(
  html: string,
  context: Parameters<typeof resolveVariableValue>[1]
): string {
  // Match smart-variable spans: <span data-type="smartVariable" data-variable-name="xxx">...</span>
  return html.replace(
    /<span[^>]*data-type="smartVariable"[^>]*data-variable-name="([^"]*)"[^>]*>[^<]*<\/span>/g,
    (_match, name) => {
      const value = resolveVariableValue(name, context);
      return value || `{{${name}}}`;
    }
  );
}

/**
 * TipTap Node extension for inline smart variables.
 * Renders as a colored badge in the editor.
 */
export const SmartVariableExtension = Node.create({
  name: "smartVariable",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      variableName: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="smartVariable"]',
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return {
            variableName: element.getAttribute("data-variable-name") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const name = HTMLAttributes.variableName || "";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "smartVariable",
        "data-variable-name": name,
        class: "smart-variable",
        contenteditable: "false",
      }),
      `{{${name}}}`,
    ];
  },

  addCommands() {
    return {
      insertVariable:
        (variableName: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { variableName },
          });
        },
    } as any;
  },
});
