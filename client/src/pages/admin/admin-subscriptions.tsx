import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import {
  CreditCard, Users, TrendingUp, Plus, Pencil, Trash2, Ticket,
  ChevronRight, ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Subscription {
  id: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string | null;
  stripeSubscriptionId: string | null;
}

interface SubsResponse {
  data: Subscription[];
  total: number;
  page: number;
  totalPages: number;
}

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: string;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  subscribers: number;
}

const PLAN_LABELS: Record<string, string> = { free: "مجاني", starter: "ستارتر", pro: "برو", business: "بيزنس" };
const PLAN_PRICES: Record<string, string> = { starter: "29 ر.س", pro: "59 ر.س", business: "99 ر.س" };
const STATUS_LABELS: Record<string, string> = { active: "نشط", trialing: "تجريبي", canceled: "ملغي", past_due: "متأخر", inactive: "غير نشط" };

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState("all");
  const [couponDialog, setCouponDialog] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteCoupon, setDeleteCoupon] = useState<Coupon | null>(null);

  // Coupon form
  const [cCode, setCCode] = useState("");
  const [cType, setCType] = useState("percentage");
  const [cValue, setCValue] = useState("");
  const [cMaxUses, setCMaxUses] = useState("");
  const [cValidFrom, setCValidFrom] = useState("");
  const [cValidUntil, setCValidUntil] = useState("");

  const { data: subs, isLoading } = useQuery<SubsResponse>({
    queryKey: ["/api/admin/subscriptions", page, planFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (planFilter !== "all") params.set("plan", planFilter);
      return apiRequest("GET", `/api/admin/subscriptions?${params}`).then(r => r.json());
    },
  });

  const { data: revenue } = useQuery<RevenueData[]>({
    queryKey: ["/api/admin/revenue"],
    queryFn: () => apiRequest("GET", "/api/admin/revenue").then(r => r.json()),
  });

  const { data: coupons } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
    queryFn: () => apiRequest("GET", "/api/admin/coupons").then(r => r.json()),
  });

  const saveCouponMutation = useMutation({
    mutationFn: (data: { id?: string; body: Record<string, any> }) =>
      data.id
        ? apiRequest("PATCH", `/api/admin/coupons/${data.id}`, data.body)
        : apiRequest("POST", "/api/admin/coupons", data.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم حفظ الكوبون" });
      closeCouponDialog();
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/coupons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم حذف الكوبون" });
      setDeleteCoupon(null);
    },
  });

  function openNewCoupon() {
    setEditCoupon(null);
    setCCode("");
    setCType("percentage");
    setCValue("");
    setCMaxUses("");
    setCValidFrom("");
    setCValidUntil("");
    setCouponDialog(true);
  }

  function openEditCoupon(c: Coupon) {
    setEditCoupon(c);
    setCCode(c.code);
    setCType(c.discountType);
    setCValue(c.discountValue);
    setCMaxUses(c.maxUses ? String(c.maxUses) : "");
    setCValidFrom(c.validFrom ? c.validFrom.slice(0, 10) : "");
    setCValidUntil(c.validUntil ? c.validUntil.slice(0, 10) : "");
    setCouponDialog(true);
  }

  function closeCouponDialog() {
    setCouponDialog(false);
    setEditCoupon(null);
  }

  function handleSaveCoupon() {
    const body: Record<string, any> = {
      code: cCode,
      discountType: cType,
      discountValue: cValue,
    };
    if (cMaxUses) body.maxUses = parseInt(cMaxUses);
    if (cValidFrom) body.validFrom = cValidFrom;
    if (cValidUntil) body.validUntil = cValidUntil;
    saveCouponMutation.mutate({ id: editCoupon?.id, body });
  }

  const subList = subs?.data || [];
  const totalPages = subs?.totalPages || 1;

  // Plan summary counts
  const planCounts = subList.reduce((acc, s) => {
    acc[s.plan] = (acc[s.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" />
        الاشتراكات والخطط
      </h1>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["starter", "pro", "business"] as const).map((plan) => (
          <Card key={plan}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{PLAN_LABELS[plan]}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{PLAN_PRICES[plan]}<span className="text-sm text-muted-foreground">/شهر</span></p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{planCounts[plan] || 0}</p>
                  <p className="text-xs text-muted-foreground">مشترك</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      {revenue && revenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              الإيرادات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" name="الإيرادات (ر.س)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Subscribers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">المشتركون</CardTitle>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="الخطة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الخطط</SelectItem>
                <SelectItem value="starter">ستارتر</SelectItem>
                <SelectItem value="pro">برو</SelectItem>
                <SelectItem value="business">بيزنس</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right p-3 font-medium">المستخدم</th>
                  <th className="text-right p-3 font-medium">الخطة</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                  <th className="text-right p-3 font-medium">تاريخ البدء</th>
                  <th className="text-right p-3 font-medium">تاريخ الانتهاء</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">جاري التحميل...</td></tr>
                ) : subList.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">لا توجد اشتراكات</td></tr>
                ) : subList.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{s.userName}</p>
                      <p className="text-xs text-muted-foreground">{s.userEmail}</p>
                    </td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{PLAN_LABELS[s.plan] || s.plan}</Badge></td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{STATUS_LABELS[s.status] || s.status}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{s.startDate ? format(new Date(s.startDate), "yyyy/MM/dd") : "-"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{s.endDate ? format(new Date(s.endDate), "yyyy/MM/dd") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupons Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              كوبونات الخصم
            </CardTitle>
            <Button size="sm" onClick={openNewCoupon}>
              <Plus className="h-4 w-4 ml-2" />
              كوبون جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!coupons?.length ? (
            <p className="text-center text-muted-foreground p-4">لا توجد كوبونات</p>
          ) : (
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="font-mono text-sm">{c.code}</Badge>
                    <span className="text-sm">
                      {c.discountType === "percentage" ? `${c.discountValue}%` : `${c.discountValue} ر.س`} خصم
                    </span>
                    <span className="text-xs text-muted-foreground">
                      استخدام: {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}
                    </span>
                    {!c.isActive && <Badge variant="destructive" className="text-xs">معطل</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCoupon(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteCoupon(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupon Dialog */}
      <Dialog open={couponDialog} onOpenChange={(open) => !open && closeCouponDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCoupon ? "تعديل الكوبون" : "كوبون جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>كود الكوبون</Label>
              <Input value={cCode} onChange={(e) => setCCode(e.target.value.toUpperCase())} placeholder="SAVE20" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>نوع الخصم</Label>
                <Select value={cType} onValueChange={setCType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>القيمة</Label>
                <Input type="number" value={cValue} onChange={(e) => setCValue(e.target.value)} placeholder={cType === "percentage" ? "20" : "10"} />
              </div>
            </div>
            <div>
              <Label>الحد الأقصى للاستخدام (اختياري)</Label>
              <Input type="number" value={cMaxUses} onChange={(e) => setCMaxUses(e.target.value)} placeholder="غير محدود" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>صالح من</Label>
                <Input type="date" value={cValidFrom} onChange={(e) => setCValidFrom(e.target.value)} />
              </div>
              <div>
                <Label>صالح حتى</Label>
                <Input type="date" value={cValidUntil} onChange={(e) => setCValidUntil(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCouponDialog}>إلغاء</Button>
            <Button onClick={handleSaveCoupon} disabled={!cCode || !cValue || saveCouponMutation.isPending}>
              {saveCouponMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Coupon */}
      <AlertDialog open={!!deleteCoupon} onOpenChange={(open) => !open && setDeleteCoupon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكوبون</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف الكوبون "{deleteCoupon?.code}"؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteCoupon && deleteCouponMutation.mutate(deleteCoupon.id)}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
