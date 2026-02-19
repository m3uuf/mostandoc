import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, FileText, Pencil, Trash2, Download } from "lucide-react";
import { generatePdfFromElement } from "@/lib/pdf-generator";
import type { Contract, Client, Profile } from "@shared/schema";

const statusLabels: Record<string, string> = { draft: "مسودة", active: "نشط", completed: "مكتمل", expired: "منتهي", terminated: "ملغي" };
const statusColors: Record<string, "default" | "secondary" | "destructive"> = { draft: "secondary", active: "default", completed: "default", expired: "destructive", terminated: "destructive" };

const templates = [
  { name: "عقد تقديم خدمات", content: `عقد تقديم خدمات\n\nتم الاتفاق بين:\nالطرف الأول: ________\nالطرف الثاني: ________\n\nالمادة الأولى - نطاق العمل:\nيقوم الطرف الثاني بتقديم الخدمات التالية:\n- ________\n\nالمادة الثانية - المقابل المالي:\nيلتزم الطرف الأول بدفع مبلغ ________ ريال سعودي.\n\nالمادة الثالثة - مدة العقد:\nيبدأ هذا العقد من تاريخ ________ وينتهي بتاريخ ________.\n\nالمادة الرابعة - شروط الإنهاء:\nيحق لأي طرف إنهاء العقد بإشعار كتابي مدته 30 يوماً.\n\nالتوقيع:\nالطرف الأول: ________\nالطرف الثاني: ________` },
  { name: "عقد مشروع", content: `عقد تنفيذ مشروع\n\nبين:\nالطرف الأول (العميل): ________\nالطرف الثاني (المنفذ): ________\n\nالمادة الأولى - وصف المشروع:\n________\n\nالمادة الثانية - المراحل والتسليمات:\n1. المرحلة الأولى: ________\n2. المرحلة الثانية: ________\n\nالمادة الثالثة - الجدول الزمني:\nتاريخ البدء: ________\nتاريخ التسليم النهائي: ________\n\nالمادة الرابعة - الدفعات:\n- دفعة مقدمة: 30%\n- عند التسليم: 70%\n\nالتوقيع:\nالطرف الأول: ________\nالطرف الثاني: ________` },
  { name: "عقد استشارات", content: `عقد تقديم استشارات\n\nالطرف الأول: ________\nالطرف الثاني (المستشار): ________\n\nالمادة الأولى - نطاق الاستشارة:\n________\n\nالمادة الثانية - الأتعاب:\nمبلغ ________ ريال سعودي مقابل ________ ساعة استشارية.\n\nالمادة الثالثة - السرية:\nيلتزم الطرف الثاني بعدم إفشاء أي معلومات سرية.\n\nالمادة الرابعة - المدة:\nمن ________ إلى ________.\n\nالتوقيع:\nالطرف الأول: ________\nالطرف الثاني: ________` },
];

export default function ContractsPage() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", clientId: "", description: "", content: "", value: "", currency: "SAR", status: "draft", startDate: "", endDate: "" });

  const { data: contractsList = [], isLoading } = useQuery<(Contract & { clientName?: string })[]>({
    queryKey: ["/api/contracts", { status: filterStatus }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/contracts?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: profile } = useQuery<Profile>({ queryKey: ["/api/profile"] });
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfContract, setPdfContract] = useState<any>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/contracts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setDialogOpen(false);
      toast({ title: "تم إنشاء العقد بنجاح" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/contracts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setDialogOpen(false);
      setEditingContract(null);
      toast({ title: "تم تحديث العقد بنجاح" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setDeleteConfirm(null);
      toast({ title: "تم حذف العقد" });
    },
  });

  const openCreate = () => {
    setEditingContract(null);
    setForm({ title: "", clientId: "", description: "", content: "", value: "", currency: "SAR", status: "draft", startDate: "", endDate: "" });
    setDialogOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingContract(contract);
    setForm({
      title: contract.title, clientId: contract.clientId || "", description: contract.description || "",
      content: contract.content || "", value: contract.value || "", currency: contract.currency || "SAR",
      status: contract.status || "draft", startDate: contract.startDate || "", endDate: contract.endDate || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast({ title: "عنوان العقد مطلوب", variant: "destructive" }); return; }
    const data = { ...form, clientId: form.clientId || null, value: form.value || null };
    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const applyTemplate = (template: typeof templates[0]) => {
    setForm({ ...form, title: template.name, content: template.content });
    toast({ title: `تم تطبيق قالب "${template.name}"` });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const downloadContractPdf = useCallback(async (contract: Contract & { clientName?: string }) => {
    setPdfGenerating(true);
    try {
      setPdfContract(contract);
      await new Promise((r) => setTimeout(r, 300));
      if (pdfRef.current) {
        const safeTitle = contract.title.replace(/[/\\?%*:|"<>]/g, "-");
        await generatePdfFromElement(pdfRef.current, `عقد-${safeTitle}.pdf`);
      }
    } catch {
      toast({ title: "فشل تحميل العقد", variant: "destructive" });
    } finally {
      setPdfGenerating(false);
      setPdfContract(null);
    }
  }, [toast]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> العقود</h1>
        <Button onClick={openCreate} data-testid="button-add-contract"><Plus className="ml-2 h-4 w-4" /> إنشاء عقد جديد</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {["all", "draft", "active", "completed", "expired", "terminated"].map((s) => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)} data-testid={`filter-${s}`}>
            {s === "all" ? "الكل" : statusLabels[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !contractsList.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد عقود. أنشئ أول عقد لك!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractsList.map((contract) => (
            <Card key={contract.id} className="hover-elevate" data-testid={`card-contract-${contract.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{contract.title}</h3>
                    <p className="text-sm text-muted-foreground">{contract.clientName || "بدون عميل"}</p>
                  </div>
                  <Badge variant={statusColors[contract.status || "draft"]}>{statusLabels[contract.status || "draft"]}</Badge>
                </div>
                {contract.value && <p className="text-lg font-bold">{Number(contract.value).toLocaleString("ar-SA")} {contract.currency || "ر.س"}</p>}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{contract.startDate || "-"}</span>
                  <span>←</span>
                  <span>{contract.endDate || "-"}</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Button size="icon" variant="ghost" onClick={() => downloadContractPdf(contract)} disabled={pdfGenerating} data-testid={`button-pdf-contract-${contract.id}`}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(contract)} data-testid={`button-edit-contract-${contract.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(contract.id)} data-testid={`button-delete-contract-${contract.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingContract ? "تعديل العقد" : "إنشاء عقد جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {templates.map((t) => (
                <Button key={t.name} variant="outline" size="sm" onClick={() => applyTemplate(t)} data-testid={`template-${t.name}`}>{t.name}</Button>
              ))}
            </div>
            <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-contract-title" /></div>
            <div>
              <Label>العميل</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger data-testid="select-contract-client"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-contract-desc" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>القيمة</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} data-testid="input-contract-value" /></div>
              <div>
                <Label>العملة</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="SAR">ريال سعودي</SelectItem><SelectItem value="USD">دولار أمريكي</SelectItem><SelectItem value="EUR">يورو</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>تاريخ البداية</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>تاريخ النهاية</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem><SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem><SelectItem value="expired">منتهي</SelectItem>
                  <SelectItem value="terminated">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>محتوى العقد</Label><Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} data-testid="input-contract-content" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-contract">
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا العقد؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pdfContract && (
        <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
          <div ref={pdfRef} style={{ width: "794px", padding: "40px", fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl", backgroundColor: "#ffffff", color: "#1a1a1a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", borderBottom: "3px solid #3B5FE5", paddingBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#3B5FE5", margin: 0 }}>{pdfContract.title}</h1>
                <p style={{ fontSize: "13px", margin: "5px 0 0", color: "#777" }}>
                  <span style={{ fontWeight: "600", color: "#555" }}>الحالة: </span>
                  {statusLabels[pdfContract.status || "draft"]}
                </p>
              </div>
              <div style={{ textAlign: "left" }}>
                {profile?.companyName && <p style={{ fontSize: "18px", fontWeight: "bold", color: "#3B5FE5", margin: 0 }}>{profile.companyName}</p>}
                {profile?.fullName && <p style={{ fontSize: "14px", margin: "3px 0 0", color: "#555" }}>{profile.fullName}</p>}
                {profile?.companyAddress && <p style={{ fontSize: "12px", margin: "3px 0 0", color: "#777" }}>{profile.companyAddress}</p>}
                {profile?.taxNumber && <p style={{ fontSize: "12px", margin: "3px 0 0", color: "#777" }}>الرقم الضريبي: {profile.taxNumber}</p>}
                {profile?.emailPublic && <p style={{ fontSize: "12px", margin: "3px 0 0", color: "#777" }}>{profile.emailPublic}</p>}
                {profile?.phonePublic && <p style={{ fontSize: "12px", margin: "3px 0 0", color: "#777" }}>{profile.phonePublic}</p>}
              </div>
            </div>

            <div style={{ display: "flex", gap: "30px", marginBottom: "25px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#777" }}>العميل: </span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{pdfContract.clientName || "-"}</span>
                </div>
                {pdfContract.description && (
                  <div>
                    <span style={{ fontSize: "12px", color: "#777" }}>الوصف: </span>
                    <span style={{ fontSize: "13px", color: "#333" }}>{pdfContract.description}</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "left", minWidth: "200px" }}>
                {pdfContract.value && (
                  <div style={{ marginBottom: "5px" }}>
                    <span style={{ fontSize: "12px", color: "#777" }}>القيمة: </span>
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3B5FE5" }}>{Number(pdfContract.value).toLocaleString("ar-SA")} {pdfContract.currency === "SAR" ? "ر.س" : pdfContract.currency}</span>
                  </div>
                )}
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ fontSize: "12px", color: "#777" }}>تاريخ البداية: </span>
                  <span style={{ fontSize: "13px", color: "#333" }}>{pdfContract.startDate || "-"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "#777" }}>تاريخ النهاية: </span>
                  <span style={{ fontSize: "13px", color: "#333" }}>{pdfContract.endDate || "-"}</span>
                </div>
              </div>
            </div>

            {pdfContract.content && (
              <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "20px", marginBottom: "30px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#3B5FE5", marginBottom: "15px" }}>محتوى العقد</h3>
                <div style={{ fontSize: "14px", lineHeight: "1.8", color: "#333", whiteSpace: "pre-wrap" }}>{pdfContract.content}</div>
              </div>
            )}

            <div style={{ borderTop: "2px solid #3B5FE5", paddingTop: "20px", marginTop: "40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "60px" }}>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "40px" }}>الطرف الأول</p>
                  <div style={{ borderTop: "1px solid #999", paddingTop: "5px" }}>
                    <p style={{ fontSize: "12px", color: "#777", margin: 0 }}>التوقيع</p>
                  </div>
                </div>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "40px" }}>الطرف الثاني</p>
                  <div style={{ borderTop: "1px solid #999", paddingTop: "5px" }}>
                    <p style={{ fontSize: "12px", color: "#777", margin: 0 }}>التوقيع</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", borderTop: "1px solid #e5e5e5", paddingTop: "15px", fontSize: "11px", color: "#999" }}>
              <p style={{ margin: 0 }}>تم إنشاء هذا العقد بواسطة مستندك</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
