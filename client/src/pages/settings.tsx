import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Settings, Loader2, Sun, Moon, CreditCard, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { Profile, Subscription } from "@shared/schema";

const PLAN_NAMES: Record<string, string> = {
  free: "مجاني",
  starter: "المبتدئ",
  pro: "المحترف",
  business: "الأعمال",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "text-green-600" },
  trialing: { label: "فترة تجريبية", color: "text-blue-600" },
  past_due: { label: "متأخر الدفع", color: "text-orange-600" },
  cancelled: { label: "ملغي", color: "text-red-600" },
  inactive: { label: "غير مفعّل", color: "text-muted-foreground" },
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: profile } = useQuery<Profile | null>({ queryKey: ["/api/profile"] });
  const { data: subscription } = useQuery<Subscription & { plan: string; status: string }>({ queryKey: ["/api/subscription"] });
  const [portalLoading, setPortalLoading] = useState(false);

  const [accountForm, setAccountForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  const [billingForm, setBillingForm] = useState({
    companyName: profile?.companyName || "",
    companyAddress: profile?.companyAddress || "",
    taxNumber: profile?.taxNumber || "",
  });

  const saveAccount = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/auth/user", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "تم حفظ بيانات الحساب" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ بيانات الحساب", variant: "destructive" });
    },
  });

  const saveBilling = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "تم حفظ بيانات الفوترة" });
    },
  });

  useEffect(() => {
    if (user) {
      setAccountForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setBillingForm({
        companyName: profile.companyName || "",
        companyAddress: profile.companyAddress || "",
        taxNumber: profile.taxNumber || "",
      });
    }
  }, [profile]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiRequest("POST", "/api/subscription/portal");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast({ title: "فشل في فتح بوابة الإدارة", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const res = await apiRequest("POST", "/api/subscription/checkout", { plan: planId });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast({ title: "فشل في إنشاء جلسة الدفع", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> الإعدادات</h1>

      <Tabs defaultValue="account">
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="account">الحساب</TabsTrigger>
          <TabsTrigger value="subscription">الاشتراك</TabsTrigger>
          <TabsTrigger value="billing">بيانات الفوترة</TabsTrigger>
          <TabsTrigger value="appearance">المظهر</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle>معلومات الحساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>الاسم الأول</Label><Input value={accountForm.firstName} onChange={(e) => setAccountForm({ ...accountForm, firstName: e.target.value })} data-testid="input-first-name" /></div>
                <div><Label>اسم العائلة</Label><Input value={accountForm.lastName} onChange={(e) => setAccountForm({ ...accountForm, lastName: e.target.value })} data-testid="input-last-name" /></div>
                <div><Label>البريد الإلكتروني</Label><Input value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} data-testid="input-email" /></div>
              </div>
              <Button onClick={() => saveAccount.mutate(accountForm)} disabled={saveAccount.isPending} data-testid="button-save-account">
                {saveAccount.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> الاشتراك</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {subscription && subscription.status !== "inactive" && subscription.plan !== "free" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-md border">
                      <p className="text-sm text-muted-foreground mb-1">الباقة الحالية</p>
                      <p className="text-lg font-bold" data-testid="text-current-plan">{PLAN_NAMES[subscription.plan] || subscription.plan}</p>
                    </div>
                    <div className="p-4 rounded-md border">
                      <p className="text-sm text-muted-foreground mb-1">الحالة</p>
                      <p className={`text-lg font-bold flex items-center gap-2 ${STATUS_MAP[subscription.status]?.color || ""}`} data-testid="text-subscription-status">
                        {subscription.status === "active" || subscription.status === "trialing" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        {STATUS_MAP[subscription.status]?.label || subscription.status}
                      </p>
                    </div>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div className="p-4 rounded-md border">
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Clock className="h-4 w-4" /> تاريخ التجديد</p>
                      <p className="font-medium" data-testid="text-renewal-date">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString("ar-SA")}
                        {subscription.cancelAtPeriodEnd && <span className="text-sm text-orange-600 mr-2">(سيتم الإلغاء عند التجديد)</span>}
                      </p>
                    </div>
                  )}
                  <Button onClick={openPortal} disabled={portalLoading} data-testid="button-manage-subscription">
                    {portalLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إدارة الاشتراك
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-md border text-center">
                    <p className="text-muted-foreground mb-2">لا يوجد اشتراك نشط</p>
                    <p className="text-sm text-muted-foreground">اختر باقة للبدء مع تجربة مجانية 14 يوم</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: "starter", name: "المبتدئ", price: "29" },
                      { id: "pro", name: "المحترف", price: "59" },
                      { id: "business", name: "الأعمال", price: "99" },
                    ].map((plan) => (
                      <Card key={plan.id} className={plan.id === "pro" ? "border-primary" : ""}>
                        <CardContent className="pt-4 text-center space-y-3">
                          <p className="font-bold">{plan.name}</p>
                          <p><span className="text-2xl font-bold">{plan.price}</span> <span className="text-sm text-muted-foreground">ر.س/شهرياً</span></p>
                          <Button variant={plan.id === "pro" ? "default" : "outline"} className="w-full" onClick={() => handleSubscribe(plan.id)} data-testid={`button-subscribe-${plan.id}`}>
                            اشترك الآن
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader><CardTitle>بيانات الفوترة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>اسم الشركة / النشاط</Label><Input value={billingForm.companyName} onChange={(e) => setBillingForm({ ...billingForm, companyName: e.target.value })} data-testid="input-company-name" /></div>
                <div><Label>الرقم الضريبي</Label><Input value={billingForm.taxNumber} onChange={(e) => setBillingForm({ ...billingForm, taxNumber: e.target.value })} data-testid="input-tax-number" /></div>
              </div>
              <div><Label>العنوان</Label><Input value={billingForm.companyAddress} onChange={(e) => setBillingForm({ ...billingForm, companyAddress: e.target.value })} data-testid="input-company-address" /></div>
              <Button onClick={() => saveBilling.mutate(billingForm)} disabled={saveBilling.isPending} data-testid="button-save-billing">
                {saveBilling.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>المظهر</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">الوضع الداكن / الفاتح</p>
                  <p className="text-sm text-muted-foreground">اختر المظهر المناسب لك</p>
                </div>
                <Button variant="outline" onClick={toggleTheme} data-testid="button-toggle-theme">
                  {theme === "light" ? <Moon className="ml-2 h-4 w-4" /> : <Sun className="ml-2 h-4 w-4" />}
                  {theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
