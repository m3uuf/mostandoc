import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Pencil, Trash2, Loader2, Users, Eye, FileText, Download, CheckCircle, Clock, Send } from "lucide-react";
import { PaginationControls } from "@/components/pagination";
import type { Client, Document } from "@shared/schema";

const statusLabels: Record<string, string> = { active: "نشط", prospect: "محتمل", inactive: "غير نشط" };
const statusColors: Record<string, "default" | "secondary" | "destructive"> = { active: "default", prospect: "secondary", inactive: "destructive" };

export default function ClientsPage() {
  const { toast } = useToast();
  const { canCreate, usage, limits } = usePlanLimits();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", status: "active", notes: "" });
  const [page, setPage] = useState(1);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  useEffect(() => { setPage(1); }, [search, filterStatus]);

  const { data: result, isLoading } = useQuery<{ data: Client[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ["/api/clients", { search, status: filterStatus, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      params.set("page", String(page));
      const res = await fetch(`/api/clients?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: clientsList = [], total = 0, totalPages = 0, limit = 20 } = result || {};

  const { data: clientDocs = [] } = useQuery<Document[]>({
    queryKey: ["/api/clients", viewingClient?.id, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${viewingClient!.id}/documents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!viewingClient,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      toast({ title: "تم إضافة العميل بنجاح" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      setEditingClient(null);
      toast({ title: "تم تحديث العميل بنجاح" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل في حذف العميل");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDeleteConfirm(null);
      setPage(1);
      toast({ title: "تم حذف العميل" });
    },
    onError: (error: Error) => {
      setDeleteConfirm(null);
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingClient(null);
    setForm({ name: "", email: "", phone: "", company: "", status: "active", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({ name: client.name, email: client.email || "", phone: client.phone || "", company: client.company || "", status: client.status || "active", notes: client.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "الاسم مطلوب", variant: "destructive" }); return; }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> العملاء
        </h1>
        <Button onClick={openCreate} disabled={!canCreate("clients")} data-testid="button-add-client">
          <Plus className="ml-2 h-4 w-4" /> إضافة عميل
        </Button>
      </div>

      {!canCreate("clients") && limits && usage && (
        <UpgradePrompt type="limit" resource="العملاء" current={usage.clients} limit={limits.clients} />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الإيميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" data-testid="input-search-clients" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="prospect">محتمل</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !clientsList.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا يوجد عملاء بعد. أضف أول عميل لك!</CardContent></Card>
      ) : (
        <div className="space-y-0">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-right p-3 font-medium">الاسم</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">الشركة</th>
                  <th className="text-right p-3 font-medium hidden sm:table-cell">الإيميل</th>
                  <th className="text-right p-3 font-medium hidden lg:table-cell">الجوال</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-center p-3 font-medium w-24">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {clientsList.map((client) => (
                  <tr key={client.id} className="border-b last:border-0" data-testid={`row-client-${client.id}`}>
                    <td className="p-3 font-medium">{client.name}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{client.company || "-"}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{client.email || "-"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{client.phone || "-"}</td>
                    <td className="p-3"><Badge variant={statusColors[client.status || "active"]}>{statusLabels[client.status || "active"]}</Badge></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewingClient(client)} title="عرض التفاصيل"><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(client)} data-testid={`button-edit-client-${client.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(client.id)} data-testid={`button-delete-client-${client.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <PaginationControls page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? "تعديل العميل" : "إضافة عميل جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-client-name" /></div>
            <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-client-email" /></div>
            <div><Label>رقم الجوال</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-client-phone" /></div>
            <div><Label>الشركة</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="input-client-company" /></div>
            <div>
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="select-client-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="prospect">محتمل</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="input-client-notes" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-client">
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Details Dialog */}
      <Dialog open={!!viewingClient} onOpenChange={() => setViewingClient(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewingClient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {viewingClient.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Client Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {viewingClient.email && (
                    <div><span className="text-muted-foreground">البريد:</span> <span className="font-medium">{viewingClient.email}</span></div>
                  )}
                  {viewingClient.phone && (
                    <div><span className="text-muted-foreground">الجوال:</span> <span className="font-medium">{viewingClient.phone}</span></div>
                  )}
                  {viewingClient.company && (
                    <div><span className="text-muted-foreground">الشركة:</span> <span className="font-medium">{viewingClient.company}</span></div>
                  )}
                  <div>
                    <span className="text-muted-foreground">الحالة:</span>{" "}
                    <Badge variant={statusColors[viewingClient.status || "active"]}>{statusLabels[viewingClient.status || "active"]}</Badge>
                  </div>
                </div>

                {/* Documents Section */}
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    المستندات ({clientDocs.length})
                  </h3>
                  {clientDocs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">لا توجد مستندات مرتبطة بهذا العميل</p>
                  ) : (
                    <div className="space-y-2">
                      {clientDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0">
                              {doc.status === "signed" ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : doc.status === "sent" ? (
                                <Send className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.status === "signed" && doc.signedAt
                                  ? `موقّع ${new Date(doc.signedAt).toLocaleDateString("ar-SA")}`
                                  : doc.status === "sent"
                                  ? "بانتظار التوقيع"
                                  : "مسودة"
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant={doc.status === "signed" ? "default" : doc.status === "sent" ? "secondary" : "outline"} className="text-[10px]">
                              {doc.status === "signed" ? "موقّع" : doc.status === "sent" ? "مُرسل" : "مسودة"}
                            </Badge>
                            {doc.status === "signed" && doc.fileUrl && (
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" title="تحميل النسخة الموقعة">
                                <Button size="icon" variant="ghost" className="h-7 w-7">
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
