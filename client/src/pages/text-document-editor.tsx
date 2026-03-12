import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRight, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, AlignLeft, AlignCenter,
  AlignRight, Highlighter, Quote, Undo, Redo, Minus, Save, Check, Loader2,
  Type, Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/schema";

type SaveStatus = "saved" | "saving" | "unsaved";

function ToolbarButton({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
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
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}

export default function TextDocumentEditor() {
  const [, params] = useRoute("/dashboard/documents/text/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const docId = params?.id;
  const isNew = docId === "new";

  const [title, setTitle] = useState("مستند بدون عنوان");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  // Refs to always hold latest values without stale closures
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

  // Always reads latest refs — no stale closure issue
  const doSave = (html: string) => {
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
  };

  const scheduleSave = (html: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(html), 2000);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
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

  // Load doc into editor (once)
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

  const setLink = () => {
    const url = window.prompt("أدخل الرابط:");
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-screen bg-background" dir="rtl">
      {/* Top bar */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40 px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/documents")} className="shrink-0">
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          className="text-base font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 h-8 max-w-xs"
          placeholder="عنوان المستند..."
          data-testid="input-doc-title"
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
          <Button size="sm" onClick={handleManualSave} disabled={saveStatus === "saving"} data-testid="button-save-doc">
            <Save className="h-3.5 w-3.5 ml-1.5" />
            حفظ
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="border-b bg-background px-4 py-1.5 flex flex-wrap items-center gap-0.5 sticky top-[53px] z-30">
        <ToolbarButton title="تراجع" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="إعادة" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

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

        <Separator orientation="vertical" className="h-5 mx-1" />

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

        <ToolbarButton title="إضافة رابط" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="خط فاصل" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto bg-muted/30 py-8 px-4">
        <div className="max-w-3xl mx-auto bg-background shadow-md rounded-sm min-h-[calc(100vh-200px)] px-12 py-10 text-base leading-relaxed">
          <EditorContent editor={editor} data-testid="text-editor-content" />
        </div>
      </div>
    </div>
  );
}
