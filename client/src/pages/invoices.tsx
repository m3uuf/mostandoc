import { useState, useRef, useCallback, useEffect } from "react";
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
import { usePlanLimits } from "@/hooks/use-plan-limits";
import UpgradePrompt from "@/components/upgrade-prompt";
import { Plus, Loader2, Receipt, Pencil, Trash2, X, Download } from "lucide-react";
import { PaginationControls } from "@/components/pagination";
import { generatePdfFromElement } from "@/lib/pdf-generator";
import type { Invoice, Client, Profile } from "@shared/schema";

const statusLabels: Record<string, string> = { draft: "مسودة", sent: "مرسلة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const statusColors: Record<string, "default" | "secondary" | "destructive"> = { draft: "secondary", sent: "default", paid: "default", overdue: "destructive", cancelled: "destructive" };

interface InvoiceFormItem { description: string; quantity: string; unitPrice: string; total: string; }

export default function InvoicesPage() {
  const { toast } = useToast();
  const { canCreate, usage, limits } = usePlanLimits();
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: "", invoiceNumber: "", issueDate: new Date().toISOString().split("T")[0], dueDate: "", vatRate: "15.00", notes: "", paymentMethod: "", status: "draft" });
  const [items, setItems] = useState<InvoiceFormItem[]>([{ description: "", quantity: "1", unitPrice: "", total: "0" }]);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [filterStatus]);

  const { data: result, isLoading } = useQuery<{ data: (Invoice & { clientName?: string })[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ["/api/invoices", { status: filterStatus, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      params.set("page", String(page));
      const res = await fetch(`/api/invoices?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: invoicesList = [], total: paginationTotal = 0, totalPages = 0, limit: paginationLimit = 20 } = result || {};

  const { data: clientsResult } = useQuery<{ data: Client[] }>({ queryKey: ["/api/clients"] });
  const clients = clientsResult?.data || [];
  const { data: profile } = useQuery<Profile>({ queryKey: ["/api/profile"] });
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfInvoice, setPdfInvoice] = useState<any>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDialogOpen(false);
      toast({ title: "تم إنشاء الفاتورة بنجاح" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDialogOpen(false);
      setEditingInvoice(null);
      toast({ title: "تم تحديث الفاتورة" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDeleteConfirm(null);
      toast({ title: "تم حذف الفاتورة" });
    },
  });

  const calcItemTotal = (qty: string, price: string) => {
    const q = parseFloat(qty) || 0;
    const p = parseFloat(price) || 0;
    return (q * p).toFixed(2);
  };

  const updateItem = (index: number, field: keyof InvoiceFormItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].total = calcItemTotal(
        field === "quantity" ? value : newItems[index].quantity,
        field === "unitPrice" ? value : newItems[index].unitPrice
      );
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { description: "", quantity: "1", unitPrice: "", total: "0" }]);
  const removeItem = (index: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total || "0"), 0);
  const vatRate = parseFloat(form.vatRate) || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const openCreate = async () => {
    setEditingInvoice(null);
    const res = await fetch("/api/invoices/next-number", { credentials: "include" });
    const { number } = await res.json();
    setForm({ clientId: "", invoiceNumber: number, issueDate: new Date().toISOString().split("T")[0], dueDate: "", vatRate: "15.00", notes: "", paymentMethod: "", status: "draft" });
    setItems([{ description: "", quantity: "1", unitPrice: "", total: "0" }]);
    setDialogOpen(true);
  };

  const openEdit = async (invoice: Invoice & { clientName?: string }) => {
    const res = await fetch(`/api/invoices/${invoice.id}`, { credentials: "include" });
    const data = await res.json();
    setEditingInvoice(data);
    setForm({
      clientId: data.clientId || "", invoiceNumber: data.invoiceNumber, issueDate: data.issueDate || "",
      dueDate: data.dueDate || "", vatRate: data.vatRate || "15.00", notes: data.notes || "",
      paymentMethod: data.paymentMethod || "", status: data.status || "draft",
    });
    setItems(data.items?.length ? data.items.map((i: any) => ({
      description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total,
    })) : [{ description: "", quantity: "1", unitPrice: "", total: "0" }]);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.invoiceNumber.trim()) { toast({ title: "رقم الفاتورة مطلوب", variant: "destructive" }); return; }
    const validItems = items.filter((i) => i.description.trim() && parseFloat(i.unitPrice) > 0);
    const data = {
      ...form, clientId: form.clientId || null,
      subtotal: subtotal.toFixed(2), vatAmount: vatAmount.toFixed(2), total: total.toFixed(2),
      items: validItems.map((item, idx) => ({ ...item, sortOrder: idx })),
    };
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const downloadInvoicePdf = useCallback(async (invoice: Invoice & { clientName?: string }) => {
    setPdfGenerating(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { credentials: "include" });
      const data = await res.json();
      setPdfInvoice({ ...data, clientName: invoice.clientName });
      await new Promise((r) => setTimeout(r, 300));
      if (pdfRef.current) {
        await generatePdfFromElement(pdfRef.current, `فاتورة-${invoice.invoiceNumber}.pdf`);
      }
    } catch {
      toast({ title: "فشل تحميل الفاتورة", variant: "destructive" });
    } finally {
      setPdfGenerating(false);
      setPdfInvoice(null);
    }
  }, [toast]);

  const paymentMethodLabels: Record<string, string> = { bank_transfer: "تحويل بنكي", cash: "نقدي", electronic: "إلكتروني" };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> الفواتير</h1>
        <Button onClick={openCreate} disabled={!canCreate("invoices")} data-testid="button-add-invoice"><Plus className="ml-2 h-4 w-4" /> إنشاء فاتورة</Button>
      </div>

      {!canCreate("invoices") && limits && usage && (
        <UpgradePrompt type="limit" resource="الفواتير" current={usage.invoices} limit={limits.invoices} />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {["all", "draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)}>
            {s === "all" ? "الكل" : statusLabels[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !invoicesList.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد فواتير. أنشئ أول فاتورة!</CardContent></Card>
      ) : (
        <div className="space-y-0">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-right p-3 font-medium">رقم الفاتورة</th>
                  <th className="text-right p-3 font-medium">العميل</th>
                  <th className="text-right p-3 font-medium">المبلغ</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">تاريخ الإصدار</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">تاريخ الاستحقاق</th>
                  <th className="text-center p-3 font-medium w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoicesList.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0" data-testid={`row-invoice-${inv.id}`}>
                    <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3 text-muted-foreground">{inv.clientName || "-"}</td>
                    <td className="p-3 font-medium">{Number(inv.total).toLocaleString("ar-SA")} ر.س</td>
                    <td className="p-3"><Badge variant={statusColors[inv.status || "draft"]}>{statusLabels[inv.status || "draft"]}</Badge></td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{inv.issueDate || "-"}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{inv.dueDate || "-"}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => downloadInvoicePdf(inv)} disabled={pdfGenerating} data-testid={`button-pdf-invoice-${inv.id}`}><Download className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <PaginationControls page={page} totalPages={totalPages} total={paginationTotal} limit={paginationLimit} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingInvoice ? "تعديل الفاتورة" : "إنشاء فاتورة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>رقم الفاتورة</Label><Input value={form.invoiceNumber} readOnly className="bg-muted" /></div>
              <div><Label>تاريخ الإصدار</Label><Input type="date" dir="ltr" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></div>
              <div><Label>تاريخ الاستحقاق</Label><Input type="date" dir="ltr" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>العميل</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem><SelectItem value="sent">مرسلة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem><SelectItem value="overdue">متأخرة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Label className="text-base font-semibold">بنود الفاتورة</Label>
                <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item"><Plus className="ml-1 h-3 w-3" /> إضافة بند</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end border-b md:border-0 pb-3 md:pb-0">
                    <div className="col-span-2 md:col-span-5"><Input placeholder="الوصف" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} data-testid={`input-item-desc-${idx}`} /></div>
                    <div className="col-span-1 md:col-span-2"><Input type="number" placeholder="الكمية" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} /></div>
                    <div className="col-span-1 md:col-span-2"><Input type="number" placeholder="السعر" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} /></div>
                    <div className="col-span-1 md:col-span-2"><Input readOnly value={item.total} className="bg-muted" /></div>
                    <div className="col-span-1 md:col-span-1"><Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1}><X className="h-4 w-4" /></Button></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2"><span>المجموع الفرعي:</span><span>{subtotal.toLocaleString("ar-SA")} ر.س</span></div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>ضريبة القيمة المضافة</span>
                  <Input type="number" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} className="w-20 h-7 text-xs" />
                  <span>%</span>
                </div>
                <span>{vatAmount.toLocaleString("ar-SA")} ر.س</span>
              </div>
              <div className="flex justify-between gap-2 font-bold text-base border-t pt-2"><span>الإجمالي:</span><span>{total.toLocaleString("ar-SA")} ر.س</span></div>
            </div>

            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="شروط الدفع، معلومات التحويل البنكي..." /></div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="electronic">إلكتروني</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-invoice">
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذه الفاتورة؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pdfInvoice && (
        <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
          <div ref={pdfRef} style={{ width: "794px", padding: "40px", fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl", backgroundColor: "#ffffff", color: "#1a1a1a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", borderBottom: "3px solid #3B5FE5", paddingBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#3B5FE5", margin: 0 }}>فاتورة</h1>
                <p style={{ fontSize: "18px", fontWeight: "600", margin: "5px 0 0", color: "#333" }}>{pdfInvoice.invoiceNumber}</p>
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

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#3B5FE5", marginBottom: "5px" }}>العميل</h3>
                <p style={{ fontSize: "14px", margin: 0, color: "#333" }}>{pdfInvoice.clientName || "-"}</p>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ fontSize: "12px", color: "#777" }}>تاريخ الإصدار: </span>
                  <span style={{ fontSize: "13px", color: "#333" }}>{pdfInvoice.issueDate || "-"}</span>
                </div>
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ fontSize: "12px", color: "#777" }}>تاريخ الاستحقاق: </span>
                  <span style={{ fontSize: "13px", color: "#333" }}>{pdfInvoice.dueDate || "-"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "#777" }}>الحالة: </span>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: pdfInvoice.status === "paid" ? "#27AE60" : pdfInvoice.status === "overdue" ? "#E74C3C" : "#333" }}>{statusLabels[pdfInvoice.status || "draft"]}</span>
                </div>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
              <thead>
                <tr style={{ backgroundColor: "#3B5FE5" }}>
                  <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontSize: "13px", fontWeight: "600" }}>#</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", color: "#fff", fontSize: "13px", fontWeight: "600" }}>الوصف</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "#fff", fontSize: "13px", fontWeight: "600" }}>الكمية</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#fff", fontSize: "13px", fontWeight: "600" }}>سعر الوحدة</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#fff", fontSize: "13px", fontWeight: "600" }}>المجموع</th>
                </tr>
              </thead>
              <tbody>
                {(pdfInvoice.items || []).map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e5e5e5", backgroundColor: idx % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#555" }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#333" }}>{item.description}</td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#333", textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", color: "#333", textAlign: "left" }}>{Number(item.unitPrice).toLocaleString("ar-SA")} ر.س</td>
                    <td style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "600", color: "#333", textAlign: "left" }}>{Number(item.total).toLocaleString("ar-SA")} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "25px" }}>
              <div style={{ width: "280px", borderTop: "2px solid #3B5FE5", paddingTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "13px" }}>
                  <span style={{ color: "#555" }}>المجموع الفرعي:</span>
                  <span style={{ color: "#333" }}>{Number(pdfInvoice.subtotal).toLocaleString("ar-SA")} ر.س</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "13px" }}>
                  <span style={{ color: "#555" }}>ضريبة القيمة المضافة ({pdfInvoice.vatRate}%):</span>
                  <span style={{ color: "#333" }}>{Number(pdfInvoice.vatAmount).toLocaleString("ar-SA")} ر.س</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "16px", fontWeight: "bold", borderTop: "2px solid #3B5FE5", marginTop: "5px" }}>
                  <span style={{ color: "#3B5FE5" }}>الإجمالي:</span>
                  <span style={{ color: "#3B5FE5" }}>{Number(pdfInvoice.total).toLocaleString("ar-SA")} ر.س</span>
                </div>
              </div>
            </div>

            {(pdfInvoice.paymentMethod || pdfInvoice.notes) && (
              <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "15px", marginBottom: "20px" }}>
                {pdfInvoice.paymentMethod && (
                  <p style={{ fontSize: "13px", margin: "0 0 5px", color: "#555" }}>
                    <span style={{ fontWeight: "600" }}>طريقة الدفع: </span>
                    {paymentMethodLabels[pdfInvoice.paymentMethod] || pdfInvoice.paymentMethod}
                  </p>
                )}
                {pdfInvoice.notes && (
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: "600", margin: "10px 0 5px", color: "#555" }}>ملاحظات:</p>
                    <p style={{ fontSize: "12px", color: "#777", whiteSpace: "pre-wrap", margin: 0 }}>{pdfInvoice.notes}</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ textAlign: "center", borderTop: "1px solid #e5e5e5", paddingTop: "15px", fontSize: "11px", color: "#999" }}>
              <p style={{ margin: 0 }}>تم إنشاء هذه الفاتورة بواسطة مستندك</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
