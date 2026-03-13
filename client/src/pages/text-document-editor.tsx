import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Placeholder } from "@tiptap/extension-placeholder";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { EditorBlocksSidebar } from "@/components/editor/editor-blocks-sidebar";
import { BlockDropExtension } from "@/components/editor/use-editor-dnd";
import { SmartVariableExtension, resolveVariablesInHtml } from "@/components/editor/variable-extension";
import { FillableFieldExtension } from "@/components/editor/fillable-fields-extension";
import { VariablePicker } from "@/components/editor/variable-picker";
import {
  ArrowRight, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, AlignLeft, AlignCenter,
  AlignRight, Highlighter, Quote, Undo, Redo, Minus, Save, Check, Loader2,
  Type, Link as LinkIcon, Table as TableIcon, Image as ImageIcon, Palette,
  Sparkles, Wand2, Languages, FileText, Scissors, Expand, PenLine,
  Megaphone, MessageSquare, CheckCircle2, X, Copy, ArrowDown,
  Plus, Trash2, Code, LayoutGrid, Download, Braces, BookMarked, Send,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import type { Document, Client } from "@shared/schema";

type SaveStatus = "saved" | "saving" | "unsaved";

// ─── Toolbar Button ────────────────────────────────────────────────
function ToolbarButton({ onClick, active, disabled, title, children, className = "" }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors text-sm ${
            active
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-foreground/80 hover:text-foreground"
          } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}

// ─── AI Actions ────────────────────────────────────────────────────
const AI_ACTIONS = [
  { id: "improve", label: "تحسين النص", icon: Wand2, desc: "تحسين الأسلوب والوضوح", needsSelection: true },
  { id: "fix_grammar", label: "تصحيح إملائي", icon: CheckCircle2, desc: "تصحيح الأخطاء الإملائية والنحوية", needsSelection: true },
  { id: "translate", label: "ترجمة", icon: Languages, desc: "ترجمة عربي ↔ إنجليزي", needsSelection: true },
  { id: "summarize", label: "تلخيص", icon: FileText, desc: "تلخيص مختصر", needsSelection: true },
  { id: "expand", label: "توسيع", icon: Expand, desc: "إضافة تفاصيل أكثر", needsSelection: true },
  { id: "shorten", label: "اختصار", icon: Scissors, desc: "اختصار مع حفظ المعنى", needsSelection: true },
  { id: "complete", label: "إكمال تلقائي", icon: PenLine, desc: "إكمال النص الحالي", needsSelection: false },
  { id: "generate", label: "توليد محتوى", icon: Sparkles, desc: "كتابة محتوى جديد من وصف", needsSelection: false },
] as const;

const AI_TONES = [
  { id: "formal", label: "رسمي", icon: "🏢" },
  { id: "friendly", label: "ودي", icon: "😊" },
  { id: "marketing", label: "تسويقي", icon: "📢" },
];

const TEXT_COLORS = [
  { name: "أسود", value: "#000000" },
  { name: "رمادي", value: "#6b7280" },
  { name: "أحمر", value: "#ef4444" },
  { name: "برتقالي", value: "#f97316" },
  { name: "أصفر", value: "#eab308" },
  { name: "أخضر", value: "#22c55e" },
  { name: "أزرق", value: "#3b82f6" },
  { name: "بنفسجي", value: "#8b5cf6" },
];

// ─── AI Result Panel ───────────────────────────────────────────────
function AIResultPanel({ result, loading, error, onAccept, onInsertAfter, onCopy, onDismiss }: {
  result: string; loading: boolean; error: string | null;
  onAccept: () => void; onInsertAfter: () => void; onCopy: () => void; onDismiss: () => void;
}) {
  if (!loading && !result && !error) return null;

  return (
    <div className="ai-result-panel border rounded-lg bg-card shadow-lg mx-auto max-w-3xl mt-4 overflow-hidden" dir="rtl">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-purple-500/10 to-blue-500/10 border-b">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">نتيجة AI</span>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500 mr-auto" />}
        {!loading && (
          <button onClick={onDismiss} className="mr-auto p-1 rounded hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {result && (
        <>
          <div
            className="px-4 py-3 text-sm leading-relaxed prose-sm max-h-64 overflow-y-auto ai-result-content"
            dir="auto"
            dangerouslySetInnerHTML={{ __html: result }}
          />
          <div className="flex items-center gap-2 px-4 py-2.5 border-t bg-muted/30">
            <Button size="sm" onClick={onAccept} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
              <Check className="h-3.5 w-3.5" /> استبدال
            </Button>
            <Button size="sm" variant="outline" onClick={onInsertAfter} className="gap-1.5">
              <ArrowDown className="h-3.5 w-3.5" /> إدراج بعده
            </Button>
            <Button size="sm" variant="ghost" onClick={onCopy} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> نسخ
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss} className="gap-1.5 mr-auto">
              تجاهل
            </Button>
          </div>
        </>
      )}

      {loading && !result && (
        <div className="flex items-center gap-3 px-4 py-6 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          <span className="text-sm text-muted-foreground">جارٍ التوليد...</span>
        </div>
      )}
    </div>
  );
}

// ─── Custom Prompt Dialog ──────────────────────────────────────────
function CustomPromptInput({ onSubmit, onCancel }: { onSubmit: (prompt: string) => void; onCancel: () => void }) {
  const [prompt, setPrompt] = useState("");
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-card border rounded-lg shadow-lg max-w-3xl mx-auto mt-4" dir="rtl">
      <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
      <Input
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="اكتب أمرك لـ AI... مثال: اكتب مقدمة عن التسويق الرقمي"
        className="border-0 bg-transparent focus-visible:ring-0 text-sm"
        autoFocus
        onKeyDown={e => {
          if (e.key === "Enter" && prompt.trim()) onSubmit(prompt.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button size="sm" onClick={() => prompt.trim() && onSubmit(prompt.trim())} disabled={!prompt.trim()} className="bg-purple-600 hover:bg-purple-700 shrink-0">
        <Sparkles className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} className="shrink-0">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Editor ───────────────────────────────────────────────────
export default function TextDocumentEditor() {
  const [, params] = useRoute("/dashboard/documents/text/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const docId = params?.id;
  const isNew = docId === "new";

  const [title, setTitle] = useState("مستند بدون عنوان");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

  // Signing dialog state
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingForSign, setSendingForSign] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Clients list for signing dialog
  const { data: clientsResult } = useQuery<{ data: Client[] }>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: showSignDialog,
  });
  const clientsList = clientsResult?.data || [];

  // AI state
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [aiSelectionRange, setAiSelectionRange] = useState<{ from: number; to: number } | null>(null);

  // Refs
  const titleRef = useRef("مستند بدون عنوان");
  const docIdRef = useRef<string | null>(isNew ? null : docId || null);
  const lastSavedContentRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const loadedRef = useRef(false);

  const { data: doc } = useQuery<Document & { fields: any[]; signatures: any[] }>({
    queryKey: ["/api/documents", docId],
    queryFn: () => fetch(`/api/documents/${docId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !isNew && !!docId,
  });

  const { data: profile } = useQuery<{ company?: string; address?: string; phone?: string }>({
    queryKey: ["/api/profile"],
    queryFn: () => fetch("/api/profile", { credentials: "include" }).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      apiRequest("POST", "/api/documents", { ...data, docType: "text" }).then(r => r.json()),
    onSuccess: (newDoc: Document) => {
      docIdRef.current = newDoc.id;
      isSavingRef.current = false;
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      navigate(`/dashboard/documents/text/${newDoc.id}`, { replace: true });
    },
    onError: () => {
      isSavingRef.current = false;
      setSaveStatus("unsaved");
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/documents/${id}`, data),
    onSuccess: () => {
      isSavingRef.current = false;
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      isSavingRef.current = false;
      setSaveStatus("unsaved");
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    },
  });

  const doSave = useCallback((html: string) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    lastSavedContentRef.current = html;
    setSaveStatus("saving");
    const id = docIdRef.current;
    const t = titleRef.current;
    if (!id) {
      createMutation.mutate({ title: t, content: html });
    } else {
      updateMutation.mutate({ id, data: { title: t, content: html } });
    }
  }, [createMutation, updateMutation]);

  const scheduleSave = useCallback((html: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(html), 2000);
  }, [doSave]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "code-block" } },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: "اكتب هنا أو اضغط / لعرض الأوامر...",
      }),
      BlockDropExtension,
      SmartVariableExtension,
      FillableFieldExtension,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[calc(100vh-220px)]",
        dir: "auto",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setSaveStatus("unsaved");
      scheduleSave(html);
    },
  });

  // Load doc
  useEffect(() => {
    if (doc && editor && !editor.isDestroyed && !loadedRef.current) {
      loadedRef.current = true;
      const t = doc.title || "مستند بدون عنوان";
      titleRef.current = t;
      setTitle(t);
      const html = (doc as any).content || "<p></p>";
      lastSavedContentRef.current = html;
      editor.commands.setContent(html, false);
      setSaveStatus("saved");
    }
  }, [doc, editor]);

  const handleTitleChange = (v: string) => {
    titleRef.current = v;
    setTitle(v);
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const html = editor?.getHTML() || "";
    saveTimerRef.current = setTimeout(() => doSave(html), 2000);
  };

  const handleManualSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSave(editor?.getHTML() || "");
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = useCallback(async () => {
    if (!editor || exportingPdf) return;
    setExportingPdf(true);
    try {
      const resolvedContent = resolveVariablesInHtml(editor.getHTML(), {
        profile,
        documentId: docIdRef.current || undefined,
      });
      await generateDocumentPdf({
        content: resolvedContent,
        title: titleRef.current,
        companyName: profile?.company,
        companyInfo: [profile?.address, profile?.phone].filter(Boolean).join(" | "),
      });
      toast({ title: "تم تصدير PDF بنجاح" });
    } catch {
      toast({ title: "فشل تصدير PDF", variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  }, [editor, exportingPdf, profile, toast]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      toast({ title: "حدد نصاً أولاً", description: "اختر المحتوى الذي تريد حفظه في المكتبة", variant: "destructive" });
      return;
    }
    // Get selected HTML using ProseMirror serializer
    const { DOMSerializer } = await import("@tiptap/pm/model");
    const slice = editor.state.doc.slice(from, to);
    const serializer = DOMSerializer.fromSchema(editor.schema);
    const container = document.createElement("div");
    container.appendChild(serializer.serializeFragment(slice.content));
    const selectedHtml = container.innerHTML;

    const name = window.prompt("اسم العنصر في المكتبة:");
    if (!name?.trim()) return;
    try {
      await apiRequest("POST", "/api/content-library", {
        name: name.trim(),
        content: selectedHtml,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content-library"] });
      toast({ title: "تم الحفظ في المكتبة" });
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    }
  }, [editor, toast]);

  const handleSendForSigning = useCallback(async () => {
    if (!recipientName.trim() || !recipientEmail.trim()) return;
    const id = docIdRef.current;
    if (!id) {
      toast({ title: "احفظ المستند أولاً", variant: "destructive" });
      return;
    }
    setSendingForSign(true);
    try {
      // Save current content first
      if (editor) {
        await apiRequest("PATCH", `/api/documents/${id}`, {
          title: titleRef.current,
          content: editor.getHTML(),
        });
      }
      // Update status to sent + recipient info + link to client
      const patchData: any = {
        status: "sent",
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
      };
      if (selectedClientId) patchData.clientId = selectedClientId;
      await apiRequest("PATCH", `/api/documents/${id}`, patchData);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "تم إرسال المستند للتوقيع", description: `سيتم إرسال رابط التوقيع إلى ${recipientEmail}` });
      setShowSignDialog(false);
      setRecipientName("");
      setRecipientEmail("");
    } catch {
      toast({ title: "فشل إرسال المستند", variant: "destructive" });
    } finally {
      setSendingForSign(false);
    }
  }, [editor, recipientName, recipientEmail, toast]);

  const setLink = () => {
    const url = window.prompt("أدخل الرابط:");
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("أدخل رابط الصورة:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // ─── AI Functions ──────────────────────────────────────────────
  const runAI = useCallback(async (action: string, extra?: string) => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    const fullText = editor.state.doc.textContent;

    // For actions that need selection
    const actionDef = AI_ACTIONS.find(a => a.id === action);
    const toneAction = AI_TONES.find(a => a.id === action);

    if ((actionDef?.needsSelection || toneAction) && !selectedText) {
      toast({ title: "حدد نصاً أولاً", description: "اختر النص الذي تريد تطبيق الأمر عليه", variant: "destructive" });
      return;
    }

    const content = selectedText || fullText;
    setAiSelectionRange(selectedText ? { from, to } : null);
    setAiResult("");
    setAiError(null);
    setAiLoading(true);
    setShowCustomPrompt(false);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, content, extra }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل الطلب");
      }

      const data = await res.json();
      setAiResult(data.result);
    } catch (e: any) {
      setAiError(e.message || "فشل في توليد المحتوى");
    } finally {
      setAiLoading(false);
    }
  }, [editor, toast]);

  const handleAIAccept = useCallback(() => {
    if (!editor || !aiResult) return;
    if (aiSelectionRange) {
      editor.chain().focus().setTextSelection(aiSelectionRange).deleteSelection().insertContent(aiResult).run();
    } else {
      editor.chain().focus().setContent(aiResult).run();
    }
    setAiResult("");
    setAiSelectionRange(null);
    setSaveStatus("unsaved");
    scheduleSave(editor.getHTML());
  }, [editor, aiResult, aiSelectionRange, scheduleSave]);

  const handleAIInsertAfter = useCallback(() => {
    if (!editor || !aiResult) return;
    const pos = aiSelectionRange?.to || editor.state.doc.content.size;
    editor.chain().focus().setTextSelection(pos).insertContent("<p></p>" + aiResult).run();
    setAiResult("");
    setAiSelectionRange(null);
    setSaveStatus("unsaved");
    scheduleSave(editor.getHTML());
  }, [editor, aiResult, aiSelectionRange, scheduleSave]);

  const handleAICopy = useCallback(() => {
    const tmp = document.createElement("div");
    tmp.innerHTML = aiResult;
    navigator.clipboard.writeText(tmp.textContent || "");
    toast({ title: "تم النسخ" });
  }, [aiResult, toast]);

  const handleAIDismiss = useCallback(() => {
    setAiResult("");
    setAiError(null);
    setAiLoading(false);
    setAiSelectionRange(null);
    setShowCustomPrompt(false);
  }, []);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-screen bg-background" dir="rtl">
      {/* ─── Top Bar ───────────────────────────────────────────── */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40 px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/documents")} className="shrink-0">
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          className="text-base font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 h-8 max-w-xs"
          placeholder="عنوان المستند..."
        />

        <div className="flex items-center gap-2 mr-auto">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> جارٍ الحفظ...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> محفوظ
            </span>
          )}
          {saveStatus === "unsaved" && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">غير محفوظ</Badge>
          )}
          <Button size="sm" onClick={handleManualSave} disabled={saveStatus === "saving"}>
            <Save className="h-3.5 w-3.5 ml-1.5" /> حفظ
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
                {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>تصدير PDF</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setShowSignDialog(true)} disabled={isNew} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                إرسال للتوقيع
              </Button>
            </TooltipTrigger>
            <TooltipContent>إرسال المستند لعميل للتوقيع</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={sidebarOpen ? "default" : "outline"}
                onClick={toggleSidebar}
                className={sidebarOpen ? "gap-1.5 bg-primary hover:bg-primary/90" : "gap-1.5"}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                العناصر
              </Button>
            </TooltipTrigger>
            <TooltipContent>{sidebarOpen ? "إخفاء لوحة العناصر" : "عرض لوحة العناصر"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ─── Formatting Toolbar ─────────────────────────────────── */}
      <div className="border-b bg-background px-4 py-1.5 flex flex-wrap items-center gap-0.5 sticky top-[53px] z-30">
        {/* Undo/Redo */}
        <ToolbarButton title="تراجع" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="إعادة" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Headings */}
        <ToolbarButton title="عنوان كبير" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="عنوان متوسط" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="عنوان صغير" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="نص عادي" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Type className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Text Formatting */}
        <ToolbarButton title="عريض" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="مائل" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="تسطير" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="يتوسطه خط" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="تظليل" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="كود" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="h-4 w-4" />
        </ToolbarButton>

        {/* Color Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground transition-colors">
              <Palette className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-0">
            <div className="grid grid-cols-4 gap-1 p-2">
              {TEXT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => editor.chain().focus().setColor(c.value).run()}
                  className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()}>
              إزالة اللون
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Lists */}
        <ToolbarButton title="قائمة نقطية" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="قائمة مرقمة" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="اقتباس" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Alignment */}
        <ToolbarButton title="محاذاة يمين" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="توسيط" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="محاذاة يسار" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Insert */}
        <ToolbarButton title="إضافة رابط" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="إدراج صورة" onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="إدراج جدول" onClick={insertTable}>
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="خط فاصل" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        {/* Smart Variables */}
        <VariablePicker editor={editor}>
          <button
            className="p-1.5 rounded hover:bg-muted text-foreground/80 hover:text-foreground transition-colors"
            title="إدراج متغير ذكي"
          >
            <Braces className="h-4 w-4" />
          </button>
        </VariablePicker>

        {/* Save to Library */}
        <ToolbarButton title="حفظ في المكتبة" onClick={handleSaveToLibrary}>
          <BookMarked className="h-4 w-4" />
        </ToolbarButton>

        {/* Table controls (show when in table) */}
        {editor.isActive("table") && (
          <>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <ToolbarButton title="إضافة عمود" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Plus className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="إضافة صف" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Plus className="h-3.5 w-3.5 rotate-90" />
            </ToolbarButton>
            <ToolbarButton title="حذف عمود" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </ToolbarButton>
            <ToolbarButton title="حذف صف" onClick={() => editor.chain().focus().deleteRow().run()}>
              <Trash2 className="h-3.5 w-3.5 text-destructive rotate-90" />
            </ToolbarButton>
            <ToolbarButton title="حذف الجدول" onClick={() => editor.chain().focus().deleteTable().run()}>
              <X className="h-3.5 w-3.5 text-destructive" />
            </ToolbarButton>
          </>
        )}

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* AI Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gradient-to-l from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56" dir="rtl">
            {AI_ACTIONS.map(action => (
              <DropdownMenuItem key={action.id} onClick={() => runAI(action.id)} className="gap-2">
                <action.icon className="h-4 w-4 text-purple-500" />
                <div className="flex flex-col">
                  <span className="text-sm">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.desc}</span>
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {/* Tone submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Megaphone className="h-4 w-4 text-purple-500" />
                <span>تغيير النبرة</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent dir="rtl">
                {AI_TONES.map(tone => (
                  <DropdownMenuItem key={tone.id} onClick={() => runAI(tone.id)} className="gap-2">
                    <span>{tone.icon}</span>
                    <span>{tone.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setShowCustomPrompt(true)} className="gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <div className="flex flex-col">
                <span className="text-sm">أمر مخصص</span>
                <span className="text-xs text-muted-foreground">اكتب تعليماتك الخاصة</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ─── Custom Prompt Input ──────────────────────────────────── */}
      {showCustomPrompt && (
        <div className="px-4 pt-2">
          <CustomPromptInput
            onSubmit={(prompt) => runAI("custom", prompt)}
            onCancel={() => setShowCustomPrompt(false)}
          />
        </div>
      )}

      {/* ─── AI Result Panel ──────────────────────────────────────── */}
      {(aiResult || aiLoading || aiError) && (
        <div className="px-4">
          <AIResultPanel
            result={aiResult}
            loading={aiLoading}
            error={aiError}
            onAccept={handleAIAccept}
            onInsertAfter={handleAIInsertAfter}
            onCopy={handleAICopy}
            onDismiss={handleAIDismiss}
          />
        </div>
      )}

      {/* ─── Editor Area + Sidebar ─────────────────────────────────── */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Editor */}
        <ResizablePanel defaultSize={sidebarOpen ? 78 : 100} minSize={50}>
          <div className="h-full overflow-auto bg-muted/30 py-8 px-4">
            <div className="max-w-3xl mx-auto bg-background shadow-md rounded-sm min-h-[calc(100vh-200px)] px-12 py-10 text-base leading-relaxed">
              <EditorContent editor={editor} />
            </div>
          </div>
        </ResizablePanel>

        {/* Sidebar */}
        {sidebarOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
              <EditorBlocksSidebar editor={editor} onToggle={toggleSidebar} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* ─── Send for Signing Dialog ──────────────────────────────── */}
      {showSignDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowSignDialog(false)}>
          <div
            className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                إرسال للتوقيع
              </h3>
              <button onClick={() => setShowSignDialog(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              سيتم إرسال رابط للعميل لعرض المستند وتوقيعه إلكترونياً
            </p>
            <div className="space-y-3">
              {/* Client selector */}
              {clientsList.length > 0 && (
                <div className="space-y-1.5">
                  <Label>اختر عميل (اختياري)</Label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedClientId(cid);
                      if (cid) {
                        const c = clientsList.find((cl) => cl.id === cid);
                        if (c) {
                          setRecipientName(c.name);
                          setRecipientEmail(c.email || "");
                        }
                      }
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">-- إدخال يدوي --</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>اسم المستلم *</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="أدخل اسم المستلم"
                />
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني *</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowSignDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleSendForSigning}
                disabled={sendingForSign || !recipientName.trim() || !recipientEmail.trim()}
                className="gap-1.5"
              >
                {sendingForSign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                إرسال
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
