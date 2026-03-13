import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { EDITOR_BLOCK_CATEGORIES, type EditorBlock, type EditorBlockCategory } from "./editor-block-definitions";
import { EDITOR_TEMPLATES, type EditorTemplate } from "./editor-templates";
import { useEditorDnd } from "./use-editor-dnd";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, X, GripVertical, LayoutGrid, FileStack, Handshake, FileText, ReceiptText, BookMarked, Trash2, Loader2, PenTool, Type, Calendar, Hash } from "lucide-react";
import { FIELD_CONFIG, type FillableFieldType } from "./fillable-fields-extension";
import type { Editor } from "@tiptap/react";

// ─── Block Item (PandaDoc style card) ───────────────────────
function BlockItem({
  block,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  block: EditorBlock;
  onDragStart: (e: React.DragEvent, blockId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const Icon = block.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          draggable
          onDragStart={(e) => onDragStart(e, block.id)}
          onDragEnd={onDragEnd}
          onClick={onClick}
          className="pandadoc-block-item group"
        >
          <div className="pandadoc-block-icon" style={{ color: block.color || "#6b7280" }}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-foreground/70 group-hover:text-foreground leading-tight mt-1">
            {block.label}
          </span>
          <GripVertical className="pandadoc-grip" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs max-w-48">
        <p className="font-medium">{block.label}</p>
        <p className="text-muted-foreground">{block.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Category Section ───────────────────────────────────────
function CategorySection({
  category,
  onDragStart,
  onDragEnd,
  onClickInsert,
}: {
  category: EditorBlockCategory;
  onDragStart: (e: React.DragEvent, blockId: string) => void;
  onDragEnd: () => void;
  onClickInsert: (blockId: string) => void;
}) {
  const CategoryIcon = category.icon;

  return (
    <div className="pandadoc-category">
      <div className="pandadoc-category-header">
        <CategoryIcon className="h-3.5 w-3.5" />
        <span>{category.label}</span>
      </div>
      <div className="pandadoc-blocks-grid">
        {category.blocks.map((block) => (
          <BlockItem
            key={block.id}
            block={block}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => onClickInsert(block.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Template Card ──────────────────────────────────────────
function TemplateCard({
  template,
  onClick,
}: {
  template: EditorTemplate;
  onClick: () => void;
}) {
  const Icon = template.icon;

  return (
    <button
      onClick={onClick}
      className="pandadoc-template-card group"
    >
      <div
        className="pandadoc-template-icon"
        style={{ background: `${template.color}15`, color: template.color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 text-right min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
          {template.label}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
          {template.description}
        </p>
      </div>
    </button>
  );
}

// ─── Library Item Card ──────────────────────────────────────
interface LibraryBlock {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  category?: string | null;
}

function LibraryCard({
  item,
  onInsert,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  item: LibraryBlock;
  onInsert: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onInsert}
      className="pandadoc-template-card group cursor-grab active:cursor-grabbing"
    >
      <div className="pandadoc-template-icon" style={{ background: "#8B5CF615", color: "#8B5CF6" }}>
        <BookMarked className="h-5 w-5" />
      </div>
      <div className="flex-1 text-right min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
          {item.name}
        </p>
        {item.description && (
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
            {item.description}
          </p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────
type SidebarTab = "blocks" | "templates" | "library";

const categoryIcons: Record<string, { icon: typeof Handshake; label: string }> = {
  contract: { icon: Handshake, label: "عقود" },
  proposal: { icon: ReceiptText, label: "عروض أسعار" },
  document: { icon: FileText, label: "مستندات" },
};

const TAB_LABELS: Record<SidebarTab, string> = {
  blocks: "العناصر",
  templates: "القوالب",
  library: "مكتبتي",
};

// ─── Main Sidebar ───────────────────────────────────────────
interface EditorBlocksSidebarProps {
  editor: Editor | null;
  onToggle: () => void;
}

export function EditorBlocksSidebar({ editor, onToggle }: EditorBlocksSidebarProps) {
  const { handleDragStart, handleDragEnd, handleClickInsert } = useEditorDnd(editor);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SidebarTab>("blocks");
  const [confirmTemplate, setConfirmTemplate] = useState<EditorTemplate | null>(null);

  // ─── Content Library Data ──────────────────────────────────
  const { data: libraryItems = [], isLoading: libraryLoading } = useQuery<LibraryBlock[]>({
    queryKey: ["/api/content-library"],
    queryFn: () => fetch("/api/content-library", { credentials: "include" }).then((r) => r.json()),
    enabled: activeTab === "library",
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/content-library/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/content-library"] }),
  });

  const handleLibraryInsert = useCallback(
    (content: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(content).run();
    },
    [editor]
  );

  const handleLibraryDragStart = useCallback(
    (e: React.DragEvent, content: string) => {
      e.dataTransfer.setData("text/html", content);
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  const applyTemplate = useCallback(
    (template: EditorTemplate) => {
      if (!editor) return;
      const currentContent = editor.getHTML();
      const isEmpty = !currentContent || currentContent === "<p></p>" || currentContent.trim() === "";
      if (!isEmpty) {
        setConfirmTemplate(template);
      } else {
        editor.chain().focus().setContent(template.getContent()).run();
      }
    },
    [editor]
  );

  const confirmApply = useCallback(() => {
    if (!editor || !confirmTemplate) return;
    editor.chain().focus().setContent(confirmTemplate.getContent()).run();
    setConfirmTemplate(null);
  }, [editor, confirmTemplate]);

  // Filter blocks by search
  const filteredCategories = search.trim()
    ? EDITOR_BLOCK_CATEGORIES.map((cat) => ({
        ...cat,
        blocks: cat.blocks.filter(
          (b) => b.label.includes(search) || b.description.includes(search)
        ),
      })).filter((cat) => cat.blocks.length > 0)
    : EDITOR_BLOCK_CATEGORIES;

  // Filter templates by search
  const filteredTemplates = search.trim()
    ? EDITOR_TEMPLATES.filter(
        (t) => t.label.includes(search) || t.description.includes(search)
      )
    : EDITOR_TEMPLATES;

  // Filter library by search
  const filteredLibrary = search.trim()
    ? libraryItems.filter(
        (item) =>
          item.name.includes(search) ||
          (item.description && item.description.includes(search))
      )
    : libraryItems;

  // Group templates by category
  const templateGroups = Object.entries(categoryIcons)
    .map(([key, { icon, label }]) => ({
      key,
      icon,
      label,
      templates: filteredTemplates.filter((t) => t.category === key),
    }))
    .filter((g) => g.templates.length > 0);

  return (
    <div className="pandadoc-sidebar" dir="rtl">
      {/* Header */}
      <div className="pandadoc-sidebar-header">
        <span className="text-sm font-semibold">
          {TAB_LABELS[activeTab]}
        </span>
        <button onClick={onToggle} className="pandadoc-close-btn">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="pandadoc-tabs">
        <button
          onClick={() => setActiveTab("blocks")}
          className={`pandadoc-tab ${activeTab === "blocks" ? "active" : ""}`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          العناصر
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`pandadoc-tab ${activeTab === "templates" ? "active" : ""}`}
        >
          <FileStack className="h-3.5 w-3.5" />
          القوالب
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`pandadoc-tab ${activeTab === "library" ? "active" : ""}`}
        >
          <BookMarked className="h-3.5 w-3.5" />
          مكتبتي
        </button>
      </div>

      {/* Search */}
      <div className="pandadoc-search">
        <Search className="h-3.5 w-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            activeTab === "blocks"
              ? "بحث عن عنصر..."
              : activeTab === "templates"
              ? "بحث عن قالب..."
              : "بحث في المكتبة..."
          }
          className="h-8 text-xs pr-8 border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "blocks" ? (
          /* ─── Blocks Tab ─────────────────────────────────────── */
          <div className="px-3 pb-4">
            <div className="pandadoc-hint">
              اسحب وأفلت العنصر في المستند
            </div>
            {filteredCategories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClickInsert={handleClickInsert}
              />
            ))}
            {filteredCategories.length === 0 && !search && null}
            {filteredCategories.length === 0 && search && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                لا توجد نتائج لـ "{search}"
              </div>
            )}

            {/* ─── Fillable Fields Section ──────────────────────── */}
            {(!search || "توقيع نص تاريخ حقل".includes(search)) && (
              <div className="pandadoc-category">
                <div className="pandadoc-category-header" style={{ color: "#EF4444" }}>
                  <PenTool className="h-3.5 w-3.5" />
                  <span>حقول التعبئة</span>
                </div>
                <div className="pandadoc-blocks-grid">
                  {([
                    { type: "signature" as FillableFieldType, icon: PenTool, label: "توقيع", color: "#EF4444" },
                    { type: "text" as FillableFieldType, icon: Type, label: "حقل نص", color: "#3B82F6" },
                    { type: "date" as FillableFieldType, icon: Calendar, label: "تاريخ", color: "#F59E0B" },
                    { type: "initials" as FillableFieldType, icon: Hash, label: "أحرف أولى", color: "#8B5CF6" },
                  ]).map((field) => {
                    const FieldIcon = field.icon;
                    return (
                      <Tooltip key={field.type}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              if (!editor) return;
                              (editor.commands as any).insertFillableField({
                                fieldType: field.type,
                                label: FIELD_CONFIG[field.type].defaultLabel,
                              });
                            }}
                            className="pandadoc-block-item group"
                          >
                            <div className="pandadoc-block-icon" style={{ color: field.color }}>
                              <FieldIcon className="h-5 w-5" />
                            </div>
                            <span className="text-[11px] font-medium text-foreground/70 group-hover:text-foreground leading-tight mt-1">
                              {field.label}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          حقل {field.label} - يظهر كحقل تعبئة للموقّع
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "templates" ? (
          /* ─── Templates Tab ──────────────────────────────────── */
          <div className="px-3 pb-4">
            <div className="pandadoc-hint">
              اضغط على القالب لتطبيقه على المستند
            </div>
            {templateGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.key} className="pandadoc-category">
                  <div className="pandadoc-category-header">
                    <GroupIcon className="h-3.5 w-3.5" />
                    <span>{group.label}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onClick={() => applyTemplate(template)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {templateGroups.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                لا توجد نتائج لـ "{search}"
              </div>
            )}
          </div>
        ) : (
          /* ─── Library Tab ────────────────────────────────────── */
          <div className="px-3 pb-4">
            <div className="pandadoc-hint">
              اسحب أو اضغط لإدراج محتوى محفوظ
            </div>
            {libraryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLibrary.length > 0 ? (
              <div className="space-y-1.5">
                {filteredLibrary.map((item) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    onInsert={() => handleLibraryInsert(item.content)}
                    onDelete={() => deleteMutation.mutate(item.id)}
                    onDragStart={(e) => handleLibraryDragStart(e, item.content)}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                {search ? `لا توجد نتائج لـ "${search}"` : "لا توجد عناصر محفوظة بعد. حدد نصاً في المحرر واستخدم زر \"حفظ في المكتبة\""}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* ─── Confirm Template Dialog ───────────────────────── */}
      {confirmTemplate && (
        <div className="pandadoc-confirm-overlay">
          <div className="pandadoc-confirm-dialog" dir="rtl">
            <p className="text-sm font-medium mb-1">تطبيق القالب؟</p>
            <p className="text-xs text-muted-foreground mb-3">
              سيتم استبدال محتوى المستند الحالي بقالب "{confirmTemplate.label}"
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmTemplate(null)}
                className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmApply}
                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
