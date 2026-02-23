import { useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, PenTool, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoIcon from "@assets/Asset_1@4x_1771471809797.png";
import type { Document, DocumentField } from "@shared/schema";

type DocumentWithDetails = Document & { fields: DocumentField[]; signatures: any[] };

export default function SignDocument() {
  const params = useParams<{ token: string }>();
  const { toast } = useToast();
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signed, setSigned] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

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
      const res = await apiRequest("POST", `/api/documents/sign/${params.token}`, {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
        signatureData,
        fieldValues: Object.keys(fieldValues).length > 0 ? fieldValues : undefined,
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
            <div className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: 400 }}>
              {doc.fileType === "image" ? (
                <img src={doc.fileUrl} alt={doc.title} className="w-full h-auto" />
              ) : (
                <iframe src={doc.fileUrl} className="w-full border-0" style={{ minHeight: 600 }} title={doc.title} />
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
                    width: 600,
                    height: 200,
                    className: "w-full",
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
