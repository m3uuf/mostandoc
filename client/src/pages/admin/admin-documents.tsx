import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Search, Trash2, ChevronRight, ChevronLeft,
  FilePenLine, FileCheck, FileX, Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AdminDocument {
  id: string;
  title: string;
  type: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  recipientEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocsResponse {
  data: AdminDocument[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "مسودة", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Clock },
  sent: { label: "مرسل", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: FilePenLine },
  signed: { label: "موقع", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: FileCheck },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: FileX },
};

export default function AdminDocuments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminDocument | null>(null);

  const { data, isLoading } = useQuery<DocsResponse>({
    queryKey: ["/api/admin/documents", page, search, statusFilter, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      return apiRequest("GET", `/api/admin/documents?${params}`).then(r => r.json());
    },
  });

  const { data: docStats } = useQuery({
    queryKey: ["/api/admin/documents/stats"],
    queryFn: () => apiRequest("GET", "/api/admin/documents/stats").then(r => r.json()),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      toast({ title: "تم حذف المستند" });
      setDeleteTarget(null);
    },
  });

  const docs = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="h-6 w-6" />
        إدارة المستندات
      </h1>

      {/* Stats Cards */}
      {docStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_MAP).map(([key, { label, color, icon: Icon }]) => (
            <Card key={key}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold">{docStats[key] || 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بعنوان المستند أو اسم المالك..."
                className="pr-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="sent">مرسل</SelectItem>
                <SelectItem value="signed">موقع</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="text">نصي</SelectItem>
                <SelectItem value="file">ملف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right p-3 font-medium">العنوان</th>
                  <th className="text-right p-3 font-medium">المالك</th>
                  <th className="text-right p-3 font-medium">النوع</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-right p-3 font-medium">المستلم</th>
                  <th className="text-right p-3 font-medium">التاريخ</th>
                  <th className="text-center p-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">جاري التحميل...</td></tr>
                ) : docs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">لا توجد مستندات</td></tr>
                ) : docs.map((doc) => {
                  const sm = STATUS_MAP[doc.status] || STATUS_MAP.draft;
                  return (
                    <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{doc.title || "بدون عنوان"}</td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm">{doc.ownerName}</p>
                          <p className="text-xs text-muted-foreground">{doc.ownerEmail}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {doc.type === "text" ? "نصي" : "ملف"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs ${sm.color}`}>{sm.label}</Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{doc.recipientEmail || "-"}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {doc.createdAt ? format(new Date(doc.createdAt), "yyyy/MM/dd") : "-"}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستند</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteTarget?.title}"؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteTarget && deleteDoc.mutate(deleteTarget.id)}
            >حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
