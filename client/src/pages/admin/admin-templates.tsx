import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LayoutTemplate, Plus, Pencil, Trash2, Star, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlatformTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  category: string;
  icon: string | null;
  color: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "contract", label: "عقود" },
  { value: "document", label: "مستندات" },
  { value: "proposal", label: "عروض" },
  { value: "letter", label: "خطابات" },
  { value: "general", label: "عام" },
];

export default function AdminTemplates() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<PlatformTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlatformTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formColor, setFormColor] = useState("#3B5FE5");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formActive, setFormActive] = useState(true);

  const { data: templates, isLoading } = useQuery<PlatformTemplate[]>({
    queryKey: ["/api/admin/templates", categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      return apiRequest("GET", `/api/admin/templates?${params}`).then(r => r.json());
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: string; body: Record<string, any> }) =>
      data.id
        ? apiRequest("PATCH", `/api/admin/templates/${data.id}`, data.body)
        : apiRequest("POST", "/api/admin/templates", data.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      toast({ title: isNew ? "تم إنشاء القالب" : "تم تحديث القالب" });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/templates"] });
      toast({ title: "تم حذف القالب" });
      setDeleteTarget(null);
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: (t: PlatformTemplate) =>
      apiRequest("PATCH", `/api/admin/templates/${t.id}`, { isFeatured: !t.isFeatured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/templates"] }),
  });

  const toggleActive = useMutation({
    mutationFn: (t: PlatformTemplate) =>
      apiRequest("PATCH", `/api/admin/templates/${t.id}`, { isActive: !t.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/templates"] }),
  });

  function openNew() {
    setIsNew(true);
    setFormName("");
    setFormDesc("");
    setFormContent("");
    setFormCategory("general");
    setFormColor("#3B5FE5");
    setFormFeatured(false);
    setFormActive(true);
    setEditTemplate({} as PlatformTemplate);
  }

  function openEdit(t: PlatformTemplate) {
    setIsNew(false);
    setFormName(t.name);
    setFormDesc(t.description || "");
    setFormContent(t.content);
    setFormCategory(t.category);
    setFormColor(t.color);
    setFormFeatured(t.isFeatured);
    setFormActive(t.isActive);
    setEditTemplate(t);
  }

  function closeDialog() {
    setEditTemplate(null);
    setIsNew(false);
  }

  function handleSave() {
    const body = {
      name: formName, description: formDesc, content: formContent,
      category: formCategory, color: formColor,
      isFeatured: formFeatured, isActive: formActive,
    };
    saveMutation.mutate({ id: isNew ? undefined : editTemplate?.id, body });
  }

  const categoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6" />
          إدارة القوالب
          <Badge variant="secondary" className="text-sm">{templates?.length || 0}</Badge>
        </h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 ml-2" />
          قالب جديد
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="الفئة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Template Cards */}
      {isLoading ? (
        <p className="text-center text-muted-foreground p-8">جاري التحميل...</p>
      ) : !templates?.length ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد قوالب. أنشئ أول قالب!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className={`relative transition-all ${!t.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <h3 className="font-semibold">{t.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFeatured.mutate(t)}>
                      <Star className={`h-4 w-4 ${t.isFeatured ? "fill-yellow-500 text-yellow-500" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{t.description}</p>}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">{categoryLabel(t.category)}</Badge>
                    {!t.isActive && <Badge variant="destructive" className="text-xs">معطل</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {t.usageCount}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "إنشاء قالب جديد" : `تعديل: ${formName}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اسم القالب</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="عقد عمل" />
              </div>
              <div>
                <Label>الفئة</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="وصف مختصر للقالب" />
            </div>
            <div>
              <Label>المحتوى (HTML)</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
                dir="auto"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>اللون</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                  <Input value={formColor} onChange={(e) => setFormColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formFeatured} onCheckedChange={setFormFeatured} />
                <Label>مميز</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label>نشط</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!formName || !formContent || saveMutation.isPending}>
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteTarget?.name}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
