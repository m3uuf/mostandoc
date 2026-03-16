import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, PenTool, FileText, Type, Calendar, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
const logoIcon = "/favicon.png";
import type { Document, DocumentField } from "@shared/schema";
import { extractFillableFields, type FillableFieldAttrs, type FillableFieldType, FIELD_CONFIG } from "@/components/editor/fillable-fields-extension";

type DocumentWithDetails = Document & { fields: DocumentField[]; signatures: any[] };

function normalizeFileUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("//")) return "https:" + url;
  return url;
}

function PdfRenderer({ fileUrl }: { fileUrl: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const normalizedUrl = normalizeFileUrl(fileUrl);

  useEffect(() => {
    fetch(normalizedUrl, { method: "HEAD" })
      .then(r => { if (!r.ok) setError(true); })
      .catch(() => setError(true));
  }, [normalizedUrl]);

  if (error) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p className="text-muted-foreground">الملف غير متوفر حالياً</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: 600 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <div style={{ marginTop: -40, height: "calc(100% + 40px)" }}>
        <iframe
          src={`${normalizedUrl}#toolbar=0&navpanes=0&view=FitH`}
          className="w-full border-0"
          style={{ height: 900, minHeight: 700 }}
          title="PDF Preview"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}

export default function SignDocument() {
  const params = useParams<{ token: string }>();
  const { toast } = useToast();
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signed, setSigned] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fillableValues, setFillableValues] = useState<Record<number, string>>({});
  const fillableSigRefs = useRef<Record<number, SignatureCanvas | null>>({});

  const { data: doc, isLoading, error } = useQuery<DocumentWithDetails>({
    queryKey: ["/api/documents/sign", params.token],
    queryFn: async () => {
      const res = await fetch(`/api/documents/sign/${params.token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل في تحميل المستند");
      }
      return res.json();
    },
    enabled: !!params.token,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
        throw new Error("الرجاء التوقيع أولاً");
      }
      if (!signerName.trim()) {
        throw new Error("الاسم مطلوب");
      }
      const signatureData = sigPadRef.current.toDataURL("image/png");

      // Collect fillable field signature data
      const fillableSigData: Record<number, string> = {};
      Object.entries(fillableSigRefs.current).forEach(([idx, ref]) => {
        if (ref && !ref.isEmpty()) {
          fillableSigData[Number(idx)] = ref.toDataURL("image/png");
        }
      });

      const res = await apiRequest("POST", `/api/documents/sign/${params.token}`, {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
        signatureData,
        fieldValues: Object.keys(fieldValues).length > 0 ? fieldValues : undefined,
        fillableFieldValues: Object.keys(fillableValues).length > 0 ? fillableValues : undefined,
        fillableSignatures: Object.keys(fillableSigData).length > 0 ? fillableSigData : undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setSigned(true);
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // Extract fillable fields from text document content (must be before early returns)
  const fillableFields = useMemo(() => {
    if (doc?.docType === "text" && doc.content) {
      return extractFillableFields(doc.content as string);
    }
    return [];
  }, [doc]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">المستند غير متاح</h2>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || "هذا الرابط غير صالح أو المستند لم يعد متاحاً للتوقيع."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (doc.status === "signed" || signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center" data-testid="sign-success">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">تم التوقيع بنجاح</h2>
            <p className="text-sm text-muted-foreground">شكراً لك، تم توقيع المستند بنجاح.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="border-b">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
          <img src={logoIcon} alt="مستندك" className="w-8 h-8 rounded-md" />
          <div>
            <h1 className="font-bold">مستندك</h1>
            <p className="text-xs text-muted-foreground">توقيع المستندات إلكترونياً</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">{doc.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">يرجى مراجعة المستند والتوقيع أدناه</p>
          </div>
          <Badge variant="secondary">بانتظار التوقيع</Badge>
        </div>

        {/* Document preview */}
        <Card>
          <CardContent className="p-0">
            {doc.docType === "text" ? (
              /* ─── Text Document (HTML content) ───────────────── */
              <div>
                <div
                  className="prose prose-sm max-w-none px-4 md:px-8 py-4 md:py-6 bg-white dark:bg-gray-900 rounded-t-lg text-base leading-relaxed"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: (doc as any).content || "" }}
                  style={{ minHeight: 300, fontFamily: "'IBM Plex Sans Arabic', Tahoma, sans-serif" }}
                />

                {/* ─── Fillable Fields Interactive Section ───── */}
                {fillableFields.length > 0 && (
                  <div className="border-t bg-gray-50 dark:bg-gray-900/50 px-4 md:px-8 py-4 md:py-6 rounded-b-lg space-y-4" dir="rtl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PenTool className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">حقول مطلوب تعبئتها</h3>
                        <p className="text-xs text-muted-foreground">يرجى تعبئة الحقول التالية قبل التوقيع</p>
                      </div>
                    </div>

                    {fillableFields.map((field, idx) => {
                      const config = FIELD_CONFIG[field.fieldType];
                      return (
                        <div
                          key={idx}
                          className="signing-fillable-field"
                          style={{
                            borderColor: `${config.color}60`,
                            background: `${config.color}05`,
                            ["--field-color-alpha" as any]: `${config.color}20`,
                          }}
                        >
                          <div className="field-label" style={{ color: config.color }}>
                            <span>{config.emoji}</span>
                            <span>{field.label}</span>
                            {field.required && <span className="text-red-500 text-xs">*</span>}
                          </div>

                          {field.fieldType === "signature" ? (
                            <div>
                              <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white" style={{ borderColor: `${config.color}40` }}>
                                <SignatureCanvas
                                  ref={(ref) => { fillableSigRefs.current[idx] = ref; }}
                                  penColor={config.color}
                                  canvasProps={{
                                    className: "w-full",
                                    style: { width: "100%", height: "150px" },
                                  }}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 text-xs"
                                style={{ color: config.color }}
                                onClick={() => fillableSigRefs.current[idx]?.clear()}
                              >
                                مسح
                              </Button>
                            </div>
                          ) : field.fieldType === "date" ? (
                            <input
                              type="date"
                              className="field-input"
                              style={{ borderBottomColor: `${config.color}40`, color: config.color }}
                              value={fillableValues[idx] || ""}
                              onChange={(e) => setFillableValues((prev) => ({ ...prev, [idx]: e.target.value }))}
                            />
                          ) : field.fieldType === "initials" ? (
                            <input
                              type="text"
                              className="field-input"
                              style={{ borderBottomColor: `${config.color}40`, color: config.color }}
                              placeholder="أدخل الأحرف الأولى..."
                              maxLength={5}
                              value={fillableValues[idx] || ""}
                              onChange={(e) => setFillableValues((prev) => ({ ...prev, [idx]: e.target.value }))}
                            />
                          ) : (
                            <input
                              type="text"
                              className="field-input"
                              style={{ borderBottomColor: `${config.color}40`, color: config.color }}
                              placeholder={`أدخل ${field.label}...`}
                              value={fillableValues[idx] || ""}
                              onChange={(e) => setFillableValues((prev) => ({ ...prev, [idx]: e.target.value }))}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ─── File Document (PDF/Image) ──────────────────── */
              <div className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: 400 }}>
                {doc.fileType === "image" ? (
                  <img src={doc.fileUrl} alt={doc.title} className="w-full h-auto" />
                ) : (
                  <PdfRenderer fileUrl={doc.fileUrl!} />
                )}

                {/* Show fields on document */}
                {doc.fields?.map((field) => (
                  <div
                    key={field.id}
                    className="absolute border-2 border-dashed border-primary/40 bg-primary/5 rounded flex items-center justify-center overflow-hidden"
                    style={{
                      left: Number(field.x),
                      top: Number(field.y),
                      width: Number(field.width),
                      height: Number(field.height),
                    }}
                  >
                    {field.type === "signature" ? (
                      <span className="text-xs text-primary text-center">
                        <PenTool className="h-4 w-4 mx-auto mb-1" />
                        منطقة التوقيع
                      </span>
                    ) : field.type === "text" ? (
                      <input
                        type="text"
                        value={fieldValues[field.id] || field.value || ""}
                        onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.label || "نص"}
                        className="w-full h-full text-xs px-1 bg-transparent border-0 outline-none text-center"
                        data-testid={`field-input-${field.id}`}
                      />
                    ) : field.type === "date" ? (
                      <input
                        type="date"
                        value={fieldValues[field.id] || field.value || ""}
                        onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full h-full text-xs px-1 bg-transparent border-0 outline-none text-center"
                        data-testid={`field-date-${field.id}`}
                      />
                    ) : (
                      <span className="text-xs px-2">{field.value || field.label}</span>
                    )}
                    <div className="absolute -top-5 right-0 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-t font-medium whitespace-nowrap">
                      {field.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signing form */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-lg">معلومات التوقيع</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  data-testid="input-signer-name"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني (اختياري)</Label>
                <Input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                  data-testid="input-signer-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>التوقيع *</Label>
              <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white">
                <SignatureCanvas
                  ref={sigPadRef}
                  penColor="black"
                  canvasProps={{
                    className: "w-full",
                    style: { width: "100%", height: "200px" },
                    "data-testid": "public-signature-canvas",
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sigPadRef.current?.clear()}
                data-testid="button-clear-public-signature"
              >
                مسح التوقيع
              </Button>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending || !signerName.trim()}
              data-testid="button-submit-signature"
            >
              {signMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              <PenTool className="ml-2 h-4 w-4" />
              توقيع المستند
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              بالضغط على "توقيع المستند"، أنت توافق على أن توقيعك الإلكتروني يعادل توقيعك اليدوي.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
