import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Search, MoreVertical, Shield, Ban, Trash2,
  ShieldCheck, CreditCard, Pencil, Eye, UserCog,
  ChevronRight, ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_suspended: boolean;
  auth_provider: string;
  email_verified: boolean;
  created_at: string;
  clients_count: string;
  contracts_count: string;
  sub_plan: string | null;
  sub_status: string | null;
  sub_end: string | null;
}

interface UsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PLAN_LABELS: Record<string, string> = { free: "مجاني", starter: "ستارتر", pro: "برو", business: "بيزنس" };
const STATUS_LABELS: Record<string, string> = { active: "نشط", inactive: "غير نشط", trialing: "تجريبي", canceled: "ملغي", past_due: "متأخر" };

function subBadge(plan: string | null, status: string | null) {
  if (!plan || plan === "free" || !status || status === "inactive") {
    return <Badge variant="outline" className="text-xs text-muted-foreground">مجاني</Badge>;
  }
  const colors: Record<string, string> = {
    starter: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    pro: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
    business: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[plan] || ""}`}>
      {PLAN_LABELS[plan] || plan}
      {status === "trialing" && " (تجريبي)"}
    </Badge>
  );
}

function roleBadge(role: string) {
  if (role === "superadmin") return <Badge className="bg-purple-600 text-white text-xs">سوبر أدمن</Badge>;
  if (role === "admin") return <Badge className="bg-blue-600 text-white text-xs">أدمن</Badge>;
  return <Badge variant="secondary" className="text-xs">مستخدم</Badge>;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("user");
  const [editPlan, setEditPlan] = useState("free");
  const [editSubStatus, setEditSubStatus] = useState("active");
  const [activityUser, setActivityUser] = useState<AdminUser | null>(null);

  const { data: usersData, isLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users", page, search, roleFilter, planFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (planFilter !== "all") params.set("plan", planFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return apiRequest("GET", `/api/admin/users?${params}`).then(r => r.json());
    },
  });

  const { data: activityData } = useQuery({
    queryKey: ["/api/admin/users", activityUser?.id, "activity"],
    queryFn: () => apiRequest("GET", `/api/admin/users/${activityUser!.id}/activity`).then(r => r.json()),
    enabled: !!activityUser,
  });

  const updateUser = useMutation({
    mutationFn: (data: { id: string; updates: Record<string, any> }) =>
      apiRequest("PATCH", `/api/admin/users/${data.id}`, data.updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم تحديث المستخدم" });
      setEditTarget(null);
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم حذف المستخدم" });
      setDeleteTarget(null);
    },
  });

  const impersonate = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/impersonate/${id}`),
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: () => {
      toast({ title: "فشل انتحال الهوية", variant: "destructive" });
    },
  });

  const users = usersData?.data || [];
  const total = usersData?.total || 0;
  const totalPages = usersData?.totalPages || 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          إدارة المستخدمين
          <Badge variant="secondary" className="text-sm">{total}</Badge>
        </h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد..."
                className="pr-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="الدور" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأدوار</SelectItem>
                <SelectItem value="user">مستخدم</SelectItem>
                <SelectItem value="admin">أدمن</SelectItem>
                <SelectItem value="superadmin">سوبر أدمن</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="الخطة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الخطط</SelectItem>
                <SelectItem value="free">مجاني</SelectItem>
                <SelectItem value="starter">ستارتر</SelectItem>
                <SelectItem value="pro">برو</SelectItem>
                <SelectItem value="business">بيزنس</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right p-3 font-medium">المستخدم</th>
                  <th className="text-right p-3 font-medium">الدور</th>
                  <th className="text-right p-3 font-medium">الخطة</th>
                  <th className="text-right p-3 font-medium">العملاء</th>
                  <th className="text-right p-3 font-medium">العقود</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-right p-3 font-medium">التسجيل</th>
                  <th className="text-center p-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">جاري التحميل...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">لا توجد نتائج</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-3">{roleBadge(u.role)}</td>
                    <td className="p-3">{subBadge(u.sub_plan, u.sub_status)}</td>
                    <td className="p-3">{u.clients_count}</td>
                    <td className="p-3">{u.contracts_count}</td>
                    <td className="p-3">
                      {u.is_suspended
                        ? <Badge variant="destructive" className="text-xs">معلق</Badge>
                        : <Badge variant="outline" className="text-xs text-green-600 border-green-200">نشط</Badge>
                      }
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {u.created_at ? format(new Date(u.created_at), "yyyy/MM/dd") : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setActivityUser(u)}>
                            <Eye className="h-4 w-4 ml-2" /> عرض النشاط
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditTarget(u);
                            setEditRole(u.role);
                            setEditPlan(u.sub_plan || "free");
                            setEditSubStatus(u.sub_status || "active");
                          }}>
                            <Pencil className="h-4 w-4 ml-2" /> تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() =>
                            updateUser.mutate({ id: u.id, updates: { isSuspended: !u.is_suspended } })
                          }>
                            <Ban className="h-4 w-4 ml-2" />
                            {u.is_suspended ? "إلغاء التعليق" : "تعليق الحساب"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => impersonate.mutate(u.id)}>
                            <UserCog className="h-4 w-4 ml-2" /> انتحال الهوية
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(u)}>
                            <Trash2 className="h-4 w-4 ml-2" /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {totalPages} ({total} مستخدم)
              </span>
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

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل المستخدم: {editTarget?.first_name} {editTarget?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الدور</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="admin">أدمن</SelectItem>
                  <SelectItem value="superadmin">سوبر أدمن</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الخطة</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">مجاني</SelectItem>
                  <SelectItem value="starter">ستارتر</SelectItem>
                  <SelectItem value="pro">برو</SelectItem>
                  <SelectItem value="business">بيزنس</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>حالة الاشتراك</Label>
              <Select value={editSubStatus} onValueChange={setEditSubStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="trialing">تجريبي</SelectItem>
                  <SelectItem value="canceled">ملغي</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button onClick={() => editTarget && updateUser.mutate({
              id: editTarget.id,
              updates: { role: editRole, subscription: { plan: editPlan, status: editSubStatus } },
            })}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {deleteTarget?.first_name} {deleteTarget?.last_name}؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
            >حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Dialog */}
      <Dialog open={!!activityUser} onOpenChange={(open) => !open && setActivityUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>نشاط: {activityUser?.first_name} {activityUser?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activityData?.recentActions?.length > 0 ? (
              activityData.recentActions.map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.details}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {a.createdAt ? format(new Date(a.createdAt), "yyyy/MM/dd HH:mm") : ""}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground p-6">لا توجد نشاطات مسجلة</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityUser(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
