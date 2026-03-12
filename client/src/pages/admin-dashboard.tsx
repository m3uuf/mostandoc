import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Users, FileText, Activity, UserCheck, UserX,
  Search, MoreVertical, Shield, Ban, Trash2, RefreshCw,
  Database, ChevronRight, ChevronLeft, ShieldCheck, CreditCard, Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";

interface AdminStats {
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  clients: number;
  contracts: number;
  invoices: number;
  projects: number;
  profiles: number;
  newUsersToday: number;
  newUsersWeek: number;
}

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

const PLAN_LABELS: Record<string, string> = {
  free: "مجاني",
  starter: "ستارتر",
  pro: "برو",
  business: "بيزنس",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  trialing: "تجريبي",
  canceled: "ملغي",
  past_due: "متأخر",
};

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

export default function AdminDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("user");
  const [editPlan, setEditPlan] = useState("free");
  const [editSubStatus, setEditSubStatus] = useState("active");

  const { data: stats, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      return fetch(`/api/admin/users?${params}`, { credentials: "include" }).then(r => r.json());
    },
  });

  const patchUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم التحديث بنجاح" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteTarget(null);
      toast({ title: "تم حذف المستخدم" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const openEdit = (user: AdminUser) => {
    setEditTarget(user);
    setEditRole(user.role === "superadmin" ? "user" : user.role);
    setEditPlan(user.sub_plan || "free");
    setEditSubStatus(user.sub_status && user.sub_status !== "inactive" ? user.sub_status : "active");
  };

  const saveEdit = () => {
    if (!editTarget) return;
    const payload: any = { role: editRole };
    payload.subscription = { plan: editPlan, status: editPlan === "free" ? "inactive" : editSubStatus };
    patchUser.mutate(
      { id: editTarget.id, data: payload },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            لوحة تحكم الأدمن
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة المنصة والمستخدمين</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchStats(); qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); }}>
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
          <Link href="/dashboard/admin/migrate">
            <Button variant="outline" size="sm">
              <Database className="h-4 w-4 ml-1" />
              أداة النقل
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">إجمالي المستخدمين</span>
            </div>
            <div className="text-2xl font-bold">{stats?.users ?? "—"}</div>
            {stats && <div className="text-xs text-green-600 mt-0.5">+{stats.newUsersToday} اليوم</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">نشطون</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats?.activeUsers ?? "—"}</div>
            {stats && <div className="text-xs text-muted-foreground mt-0.5">+{stats.newUsersWeek} هذا الأسبوع</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">موقوفون</span>
            </div>
            <div className="text-2xl font-bold text-red-500">{stats?.suspendedUsers ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">العقود</span>
            </div>
            <div className="text-2xl font-bold">{stats?.contracts ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">الملفات / العملاء</span>
            </div>
            <div className="text-2xl font-bold">{stats ? `${stats.profiles} / ${stats.clients}` : "—"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1">
            <Users className="h-4 w-4" />
            المستخدمون
            {stats && <Badge variant="outline" className="mr-1 text-xs">{stats.users}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو الإيميل..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pr-9"
              data-testid="input-admin-search"
            />
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right py-3 px-4 font-medium">المستخدم</th>
                      <th className="text-right py-3 px-4 font-medium hidden md:table-cell">الدور</th>
                      <th className="text-right py-3 px-4 font-medium hidden md:table-cell">الاشتراك</th>
                      <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">الحالة</th>
                      <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">العملاء / العقود</th>
                      <th className="text-right py-3 px-4 font-medium hidden xl:table-cell">تاريخ التسجيل</th>
                      <th className="text-right py-3 px-4 font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading && (
                      <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">جارٍ التحميل...</td></tr>
                    )}
                    {!usersLoading && (!usersData?.data?.length) && (
                      <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">لا يوجد مستخدمون</td></tr>
                    )}
                    {usersData?.data?.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors" data-testid={`row-user-${user.id}`}>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          {roleBadge(user.role)}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          {subBadge(user.sub_plan, user.sub_status)}
                          {user.sub_end && user.sub_plan !== "free" && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              حتى {format(new Date(user.sub_end), "dd/MM/yyyy")}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {user.is_suspended ? (
                            <Badge variant="destructive" className="text-xs">موقوف</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">نشط</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                          {user.clients_count} / {user.contracts_count}
                        </td>
                        <td className="py-3 px-4 hidden xl:table-cell text-muted-foreground text-xs">
                          {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-user-actions-${user.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Pencil className="h-4 w-4 ml-2 text-primary" />
                                تعديل الصلاحيات والاشتراك
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!user.is_suspended ? (
                                <DropdownMenuItem onClick={() => patchUser.mutate({ id: user.id, data: { isSuspended: true } })}>
                                  <Ban className="h-4 w-4 ml-2 text-orange-500" />
                                  إيقاف الحساب
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => patchUser.mutate({ id: user.id, data: { isSuspended: false } })}>
                                  <UserCheck className="h-4 w-4 ml-2 text-green-500" />
                                  تفعيل الحساب
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                حذف المستخدم
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {usersData && usersData.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {usersData.total} مستخدم — صفحة {page} من {usersData.totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= usersData.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              تعديل المستخدم
            </DialogTitle>
          </DialogHeader>

          {editTarget && (
            <div className="space-y-5 py-2">
              {/* User info */}
              <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm">
                <div className="font-medium">{editTarget.first_name} {editTarget.last_name}</div>
                <div className="text-muted-foreground">{editTarget.email}</div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  الصلاحيات
                </Label>
                <Select value={editRole} onValueChange={setEditRole} dir="rtl">
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">مستخدم عادي</SelectItem>
                    <SelectItem value="admin">أدمن</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription Plan */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  الباقة
                </Label>
                <Select value={editPlan} onValueChange={setEditPlan} dir="rtl">
                  <SelectTrigger data-testid="select-edit-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">مجاني</SelectItem>
                    <SelectItem value="starter">ستارتر — 29 ريال/شهر</SelectItem>
                    <SelectItem value="pro">برو — 59 ريال/شهر</SelectItem>
                    <SelectItem value="business">بيزنس — 99 ريال/شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription Status (only if not free) */}
              {editPlan !== "free" && (
                <div className="space-y-2">
                  <Label>حالة الاشتراك</Label>
                  <Select value={editSubStatus} onValueChange={setEditSubStatus} dir="rtl">
                    <SelectTrigger data-testid="select-edit-sub-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="trialing">تجريبي</SelectItem>
                      <SelectItem value="canceled">ملغي</SelectItem>
                      <SelectItem value="past_due">متأخر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button onClick={saveEdit} disabled={patchUser.isPending} data-testid="button-save-edit-user">
              {patchUser.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف حساب <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong> ({deleteTarget?.email})؟
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
