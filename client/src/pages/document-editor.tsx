import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight, Save, Send, Type, Calendar, PenTool, Trash2, Loader2, Copy, GripVertical, Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Document, DocumentField, Client } from "@shared/schema";
import { Users } from "lucide-react";

interface FieldItem {
  id?: string;
  tempId: string;
  type: string;
  label: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
}

const FIELD_TYPES = [
  { type: "text", label: "نص", icon: Type },
  { type: "date", label: "تاريخ", icon: Calendar },
  { type: "signature", label: "توقيع", icon: PenTool },
];

type DocumentWithDetails = Document & { fields: DocumentField[]; signatures: any[] };

function normalizeFileUrl(url: string): string {
  if (!url) return url;
  // Fix protocol-relative URLs from Bubble CDN
  if (url.startsWith("//")) return "https:" + url;
  return url;
}

function PdfRenderer({ fileUrl, onLoad }: { fileUrl: string; onLoad?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const normalizedUrl = normalizeFileUrl(fileUrl);

  useEffect(() => {
    let cancelled = false;
    const renderPdf = async () => {
      try {
        // Fetch PDF as blob and create object URL for iframe
        const response = await fetch(normalizedUrl, { credentials: "include" });
        if (!response.ok) { setError(true); setLoading(false); return; }
        const blob = await response.blob();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);

        // Use pdfjs to get page count & dimensions (not render)
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf = await pdfjsLib.getDocument({ url: objectUrl }).promise;
        if (cancelled) { URL.revokeObjectURL(objectUrl); return; }

        // Calculate total height based on page dimensions
        const containerWidth = containerRef.current?.clientWidth || 800;
        let totalHeight = 0;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / viewport.width;
          totalHeight += viewport.height * scale;
        }
        // Add some padding between pages
        totalHeight += (pdf.numPages - 1) * 4;

        if (!cancelled && containerRef.current) {
          // Create a non-scrolling iframe with the exact height
          const wrapper = document.createElement("div");
          wrapper.style.overflow = "hidden";
          wrapper.style.width = "100%";
          wrapper.style.height = totalHeight + "px";
          wrapper.style.marginTop = "-40px"; // Hide toolbar
          wrapper.style.paddingTop = "0";

          const iframe = document.createElement("iframe");
          iframe.src = objectUrl + "#toolbar=0&navpanes=0&scrollbar=0&view=FitH";
          iframe.style.width = "100%";
          iframe.style.height = (totalHeight + 60) + "px"; // Extra for hidden toolbar
          iframe.style.border = "none";
          iframe.style.pointerEvents = "none"; // Let clicks pass through to fields
          iframe.title = "PDF Preview";
          iframe.setAttribute("scrolling", "no");
          iframe.onload = () => { setLoading(false); onLoad?.(); };

          wrapper.appendChild(iframe);
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(wrapper);
        }
      } catch (err) {
        console.error("PDF render error:", err);
        if (!cancelled) { setError(true); setLoading(false); }
      }
    };
    renderPdf();
    return () => { cancelled = true; };
  }, [normalizedUrl, onLoad]);

  if (error) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">الملف غير متوفر حالياً</p>
          <p className="text-xs text-muted-foreground">قد يكون الملف محذوفاً أو تم نقله</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <div ref={containerRef} style={{ minHeight: loading ? 400 : undefined }} />
    </div>
  );
}

export default function DocumentEditor() {
  const [location, navigate] = useLocation();
  const documentId = location.replace(/[?#].*$/, "").replace(/\/$/, "").split("/").filter(Boolean).pop();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sigPadRef = useRef<SignatureCanvas>(null);

  const [fields, setFields] = useState<FieldItem[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [sigFieldId, setSigFieldId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);

  const { data: doc, isLoading } = useQuery<DocumentWithDetails>({
    queryKey: ["/api/documents", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!documentId,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      if (doc.clientId) setSelectedClientId(doc.clientId);
      if (doc.fields?.length) {
        setFields(doc.fields.map((f) => ({
          id: f.id,
          tempId: f.id,
          type: f.type,
          label: f.label || "",
          value: f.value || "",
          x: Number(f.x),
          y: Number(f.y),
          width: Number(f.width),
          height: Number(f.height),
          page: f.page || 0,
          required: f.required ?? true,
        })));
      }
    }
  }, [doc]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (title !== doc?.title) {
        await apiRequest("PATCH", `/api/documents/${documentId}`, { title });
      }
      await apiRequest("PUT", `/api/documents/${documentId}/fields`, {
        fields: fields.map((f) => ({
          type: f.type,
          label: f.label,
          value: f.value,
          x: String(f.x),
          y: String(f.y),
          width: String(f.width),
          height: String(f.height),
          page: f.page,
          required: f.required,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });
      toast({ title: "تم الحفظ", description: "تم حفظ التعديلات بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حفظ التعديلات", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      const payload: any = {
        status: "sent",
        recipientName,
        recipientEmail,
      };
      if (selectedClientId && selectedClientId !== "__none__") payload.clientId = selectedClientId;
      else payload.clientId = null;
      await apiRequest("PATCH", `/api/documents/${documentId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });
      setSendDialogOpen(false);
      const emailMsg = recipientEmail ? "وتم إرسال بريد إلكتروني للمستلم" : "تم تجهيز المستند للتوقيع";
      toast({ title: "تم الإرسال", description: emailMsg });
    },
  });

  const addField = (type: string) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newField: FieldItem = {
      tempId,
      type,
      label: type === "text" ? "نص" : type === "date" ? "تاريخ" : "توقيع",
      value: type === "date" ? new Date().toISOString().split("T")[0] : "",
      x: 50,
      y: 50 + fields.length * 60,
      width: type === "signature" ? 250 : 200,
      height: type === "signature" ? 80 : 40,
      page: 0,
      required: true,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(tempId);
  };

  const removeField = (tempId: string) => {
    setFields((prev) => prev.filter((f) => f.tempId !== tempId));
    if (selectedFieldId === tempId) setSelectedFieldId(null);
  };

  const updateField = (tempId: string, updates: Partial<FieldItem>) => {
    setFields((prev) => prev.map((f) => f.tempId === tempId ? { ...f, ...updates } : f));
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, tempId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const field = fields.find((f) => f.tempId === tempId);
    if (!field) return;
    setDragging(tempId);
    setSelectedFieldId(tempId);
    setDragOffset({
      x: e.clientX - rect.left - field.x,
      y: e.clientY - rect.top - field.y,
    });
  }, [fields]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 50, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(0, Math.min(rect.height - 30, e.clientY - rect.top - dragOffset.y));
    updateField(dragging, { x, y });
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const openSignaturePad = (tempId: string) => {
    setSigFieldId(tempId);
    setSigDialogOpen(true);
  };

  const saveSignature = () => {
    if (!sigPadRef.current || !sigFieldId) return;
    if (sigPadRef.current.isEmpty()) {
      toast({ title: "خطأ", description: "الرجاء التوقيع أولاً", variant: "destructive" });
      return;
    }
    const data = sigPadRef.current.toDataURL("image/png");
    updateField(sigFieldId, { value: data });
    setSigDialogOpen(false);
    setSigFieldId(null);
  };

  const copyShareLink = () => {
    if (!doc?.shareToken) return;
    const link = `${window.location.origin}/sign/${doc.shareToken}`;
    navigator.clipboard.writeText(link);
    toast({ title: "تم النسخ", description: "تم نسخ رابط التوقيع" });
  };

  const selectedField = fields.find((f) => f.tempId === selectedFieldId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">المستند غير موجود</p>
        <Button onClick={() => navigate("/dashboard/documents")} className="mt-4">العودة</Button>
      </div>
    );
  }

  const statusInfo = { draft: "مسودة", sent: "مرسل للتوقيع", signed: "موقّع" };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-3 border-b flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/documents")} data-testid="button-back">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-semibold text-base border-0 bg-transparent px-1 h-auto w-48 md:w-64"
            data-testid="input-document-title-edit"
          />
          <Badge variant="secondary">{statusInfo[doc.status as keyof typeof statusInfo] || doc.status}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {doc.shareToken && (
            <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="button-copy-link">
              <Copy className="ml-1 h-3 w-3" />
              نسخ الرابط
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <Save className="ml-1 h-3 w-3" />}
            حفظ
          </Button>
          <Button size="sm" onClick={() => setSendDialogOpen(true)} data-testid="button-send">
            <Send className="ml-1 h-3 w-3" />
            إرسال للتوقيع
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-56 border-l bg-muted/30 p-3 space-y-4 overflow-y-auto shrink-0 hidden md:block">
          <div>
            <h3 className="text-sm font-semibold mb-2">إضافة حقل</h3>
            <div className="space-y-2">
              {FIELD_TYPES.map((ft) => (
                <Button
                  key={ft.type}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addField(ft.type)}
                  data-testid={`button-add-${ft.type}`}
                >
                  <ft.icon className="ml-2 h-4 w-4" />
                  {ft.label}
                </Button>
              ))}
            </div>
          </div>

          {selectedField && (
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-semibold">خصائص الحقل</h3>
              <div className="space-y-2">
                <Label className="text-xs">التسمية</Label>
                <Input
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedField.tempId, { label: e.target.value })}
                  className="h-8 text-sm"
                  data-testid="input-field-label"
                />
              </div>
              {selectedField.type === "text" && (
                <div className="space-y-2">
                  <Label className="text-xs">القيمة</Label>
                  <Input
                    value={selectedField.value}
                    onChange={(e) => updateField(selectedField.tempId, { value: e.target.value })}
                    className="h-8 text-sm"
                    data-testid="input-field-value"
                  />
                </div>
              )}
              {selectedField.type === "date" && (
                <div className="space-y-2">
                  <Label className="text-xs">التاريخ</Label>
                  <Input
                    type="date"
                    value={selectedField.value}
                    onChange={(e) => updateField(selectedField.tempId, { value: e.target.value })}
                    className="h-8 text-sm"
                    data-testid="input-field-date"
                  />
                </div>
              )}
              {selectedField.type === "signature" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openSignaturePad(selectedField.tempId)}
                  data-testid="button-open-signature-pad"
                >
                  <PenTool className="ml-2 h-4 w-4" />
                  {selectedField.value ? "تعديل التوقيع" : "إضافة توقيع"}
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">العرض</Label>
                  <Input
                    type="number"
                    value={selectedField.width}
                    onChange={(e) => updateField(selectedField.tempId, { width: Number(e.target.value) })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الارتفاع</Label>
                  <Input
                    type="number"
                    value={selectedField.height}
                    onChange={(e) => updateField(selectedField.tempId, { height: Number(e.target.value) })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => removeField(selectedField.tempId)}
                data-testid="button-remove-field"
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف الحقل
              </Button>
            </div>
          )}

          {fields.length > 0 && (
            <div className="space-y-2 pt-3 border-t">
              <h3 className="text-sm font-semibold">الحقول ({fields.length})</h3>
              {fields.map((f) => (
                <button
                  key={f.tempId}
                  className={`w-full text-right text-xs p-2 rounded flex items-center gap-2 transition-colors ${
                    selectedFieldId === f.tempId ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedFieldId(f.tempId)}
                >
                  <GripVertical className="h-3 w-3 shrink-0" />
                  <span className="truncate">{f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile add field button */}
        <div className="fixed bottom-4 left-4 z-50 md:hidden flex gap-2">
          {FIELD_TYPES.map((ft) => (
            <Button key={ft.type} size="icon" onClick={() => addField(ft.type)} className="rounded-full h-10 w-10 shadow-lg">
              <ft.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-muted/20 p-4">
          <div
            ref={canvasRef}
            className="relative mx-auto bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden select-none min-h-[400px] md:min-h-[600px]"
            style={{ width: "100%", maxWidth: 800 }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedFieldId(null)}
            data-testid="document-canvas"
          >
            {/* Document image/PDF preview */}
            {doc.fileType === "image" ? (
              <img
                src={normalizeFileUrl(doc.fileUrl)}
                alt={doc.title}
                className="w-full h-auto"
                onLoad={() => setImageLoaded(true)}
                draggable={false}
              />
            ) : (
              <PdfRenderer fileUrl={normalizeFileUrl(doc.fileUrl)} onLoad={() => setImageLoaded(true)} />
            )}

            {/* Draggable fields */}
            {fields.map((field) => (
              <div
                key={field.tempId}
                className={`absolute cursor-move transition-shadow ${
                  selectedFieldId === field.tempId
                    ? "ring-2 ring-primary shadow-lg z-20"
                    : "ring-1 ring-border hover:ring-primary/50 z-10"
                }`}
                style={{
                  left: field.x,
                  top: field.y,
                  width: field.width,
                  height: field.height,
                }}
                onMouseDown={(e) => handleMouseDown(e, field.tempId)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFieldId(field.tempId);
                }}
                data-testid={`field-${field.tempId}`}
              >
                <div className="w-full h-full rounded border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center overflow-hidden">
                  {field.type === "signature" && field.value ? (
                    <img src={field.value} alt="توقيع" className="max-w-full max-h-full object-contain" />
                  ) : field.type === "signature" ? (
                    <button
                      className="text-xs text-primary underline"
                      onClick={(e) => { e.stopPropagation(); openSignaturePad(field.tempId); }}
                    >
                      <PenTool className="h-4 w-4 mx-auto mb-1" />
                      اضغط للتوقيع
                    </button>
                  ) : field.type === "date" ? (
                    <span className="text-xs px-2 font-medium">{field.value || "تاريخ"}</span>
                  ) : (
                    <span className="text-xs px-2 font-medium truncate">{field.value || field.label}</span>
                  )}
                </div>
                <div className="absolute -top-5 right-0 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-t font-medium whitespace-nowrap">
                  {field.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signature pad dialog */}
      <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>التوقيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              <SignatureCanvas
                ref={sigPadRef}
                penColor="black"
                canvasProps={{
                  className: "w-full",
                  style: { width: "100%", height: "200px" },
                  "data-testid": "signature-canvas",
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => sigPadRef.current?.clear()}
                data-testid="button-clear-signature"
              >
                مسح
              </Button>
              <Button className="flex-1" onClick={saveSignature} data-testid="button-save-signature">
                حفظ التوقيع
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال للتوقيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {clients && clients.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  ربط بعميل (اختياري)
                </Label>
                <Select
                  value={selectedClientId}
                  onValueChange={(val) => {
                    setSelectedClientId(val);
                    if (val && val !== "__none__") {
                      const client = clients.find((c) => c.id === val);
                      if (client) {
                        setRecipientName(client.name);
                        if (client.email) setRecipientEmail(client.email);
                      }
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="اختر عميلاً من القائمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون ربط بعميل</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.company ? `- ${c.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>اسم المستلم</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="مثال: أحمد محمد"
                data-testid="input-recipient-name"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
                data-testid="input-recipient-email"
              />
              <p className="text-xs text-muted-foreground">سيتم إرسال رابط التوقيع لهذا البريد</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">رابط التوقيع:</p>
              <code className="text-xs break-all" dir="ltr">
                {`${window.location.origin}/sign/${doc.shareToken}`}
              </code>
            </div>
            <Button
              className="w-full"
              onClick={() => sendMutation.mutate()}
              disabled={!recipientName.trim() || !recipientEmail.trim() || sendMutation.isPending}
              data-testid="button-submit-send"
            >
              {sendMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إرسال للتوقيع
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
