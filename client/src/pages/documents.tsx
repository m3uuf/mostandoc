import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, FileText, MoreVertical, Trash2, Edit, Copy,
  ExternalLink, Loader2, Upload, FileType, PenLine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import UpgradePrompt from "@/components/upgrade-prompt";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Document, Client } from "@shared/schema";
import { Users } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  sent: { label: "مرسل للتوقيع", variant: "default" },
  signed: { label: "موقّع", variant: "outline" },
};

export default function DocumentsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canCreate, usage, limits } = usePlanLimits();
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingText, setCreatingText] = useState(false);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: clientsResult } = useQuery<{ data: Client[]; total: number }>({
    queryKey: ["/api/clients"],
  });

  const getClientName = (clientId: string | null) => {
    if (!clientId || !clientsResult?.data) return null;
    const client = clientsResult.data.find((c) => c.id === clientId);
    return client?.name || null;
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "تم الحذف", description: "تم حذف المستند بنجاح" });
    },
  });

  // Create text document and navigate to editor
  const handleCreateText = async () => {
    setCreatingText(true);
    try {
      const res = await apiRequest("POST", "/api/documents", {
        title: "مستند بدون عنوان",
        docType: "text",
        content: "<p></p>",
      });
      const doc = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      navigate(`/dashboard/documents/text/${doc.id}`);
    } catch {
      toast({ title: "خطأ", description: "فشل في إنشاء المستند", variant: "destructive" });
    } finally {
      setCreatingText(false);
    }
  };

  // Create file-based document
  const handleCreateFile = async () => {
    if (!title.trim() || !file) return;
    setUploading(true);
    try {
      // Upload file directly
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/uploads/file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || "فشل في رفع الملف");
      }
      const { fileUrl } = await uploadRes.json();
      const fileType = file.type.includes("pdf") ? "pdf" : "image";
      await apiRequest("POST", "/api/documents", { title: title.trim(), fileUrl, fileType });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setCreateFileOpen(false);
      setTitle("");
      setFile(null);
      toast({ title: "تم الإنشاء", description: "تم إنشاء المستند بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل في رفع الملف", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const copyShareLink = (shareToken: string) => {
    const link = `${window.location.origin}/sign/${shareToken}`;
    navigator.clipboard.writeText(link);
    toast({ title: "تم النسخ", description: "تم نسخ رابط التوقيع" });
  };

  const getEditorPath = (doc: Document) =>
    (doc as any).docType === "text"
      ? `/dashboard/documents/text/${doc.id}`
      : `/dashboard/documents/${doc.id}`;

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">المستندات</h1>
        <div className="flex gap-2">
          {/* New text document */}
          <Button onClick={handleCreateText} disabled={creatingText || !canCreate("documents")} data-testid="button-create-text-document">
            {creatingText ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <PenLine className="ml-2 h-4 w-4" />}
            مستند نصي
          </Button>
          {/* New file document */}
          <Button variant="outline" onClick={() => setCreateFileOpen(true)} disabled={!canCreate("documents")} data-testid="button-create-file-document">
            <Upload className="ml-2 h-4 w-4" />
            رفع ملف
          </Button>
        </div>
      </div>

      {!canCreate("documents") && limits && usage && (
        <UpgradePrompt type="limit" resource="المستندات" current={usage.documents} limit={limits.documents} />
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      ) : !documents?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مستندات</h3>
            <p className="text-sm text-muted-foreground mb-6">
              أنشئ مستنداً نصياً جديداً أو ارفع ملف PDF للتوقيع
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleCreateText} disabled={creatingText}>
                <PenLine className="ml-2 h-4 w-4" />
                مستند نصي جديد
              </Button>
              <Button variant="outline" onClick={() => setCreateFileOpen(true)}>
                <Upload className="ml-2 h-4 w-4" />
                رفع ملف
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const status = STATUS_MAP[doc.status || "draft"];
            const isText = (doc as any).docType === "text";
            const editorPath = getEditorPath(doc);
            return (
              <Card
                key={doc.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                data-testid={`card-document-${doc.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                  <div className="flex-1 min-w-0" onClick={() => navigate(editorPath)}>
                    <div className="flex items-center gap-2 mb-1">
                      {isText ? (
                        <PenLine className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <FileType className="h-4 w-4 text-orange-500 shrink-0" />
                      )}
                      <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isText ? "مستند نصي" : "مستند مرفوع"} · {new Date(doc.createdAt!).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`button-menu-${doc.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(editorPath)}>
                        <Edit className="ml-2 h-4 w-4" />
                        {isText ? "فتح المحرر" : "تعديل"}
                      </DropdownMenuItem>
                      {doc.shareToken && (
                        <>
                          <DropdownMenuItem onClick={() => copyShareLink(doc.shareToken!)}>
                            <Copy className="ml-2 h-4 w-4" />
                            نسخ رابط التوقيع
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/sign/${doc.shareToken}`, "_blank")}>
                            <ExternalLink className="ml-2 h-4 w-4" />
                            فتح صفحة التوقيع
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteMutation.mutate(doc.id)}
                      >
                        <Trash2 className="ml-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent onClick={() => navigate(editorPath)}>
                  <div className="flex items-center justify-between">
                    <Badge variant={status?.variant || "secondary"}>{status?.label || doc.status}</Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getClientName(doc.clientId) && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {getClientName(doc.clientId)}
                        </span>
                      )}
                      {doc.recipientName && !getClientName(doc.clientId) && (
                        <span>{doc.recipientName}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* File Upload Dialog */}
      <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع مستند للتوقيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>عنوان المستند</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: عقد خدمات تصميم"
                data-testid="input-document-title"
              />
            </div>
            <div className="space-y-2">
              <Label>رفع الملف (PDF أو صورة)</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById("file-upload")?.click()}
                data-testid="dropzone-file-upload"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">اضغط لاختيار ملف أو اسحبه هنا</p>
                )}
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateFile}
              disabled={!title.trim() || !file || uploading}
              data-testid="button-submit-document"
            >
              {uploading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إنشاء المستند
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
