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
import { Settings, Loader2, Sun, Moon, CreditCard, CheckCircle, AlertCircle, Clock, Check, X, Lock } from "lucide-react";
import type { Profile, Subscription } from "@shared/schema";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { PLANS, PRO_PRICING_TIERS, getProPrice } from "@shared/plans";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

const PLAN_NAMES: Record<string, string> = {
  free: "مجاني",
  starter: "المبتدئ",
  pro: "المحترف",
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
  const { data: planData, isLoading: planLoading } = usePlanLimits();
  const [portalLoading, setPortalLoading] = useState(false);
  const [proClientCount, setProClientCount] = useState(100);
  const proMonthlyPrice = getProPrice(proClientCount);
  const proPricePerClient = Math.round(proMonthlyPrice / proClientCount);

  const [accountForm, setAccountForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const changePassword = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "فشل في تغيير كلمة المرور");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast({ title: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "كلمة المرور الجديدة غير متطابقة", variant: "destructive" });
      return;
    }
    changePassword.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
  };

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
      const body: any = { plan: planId };
      if (planId === "pro") {
        body.clientLimit = proClientCount;
      }
      const res = await apiRequest("POST", "/api/subscription/checkout", body);
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast({ title: "حدث خطأ", variant: "destructive" });
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

          {(user as any)?.hasPassword && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> تغيير كلمة المرور</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>كلمة المرور الحالية</Label><Input type="password" dir="ltr" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} data-testid="input-current-password" /></div>
                  <div />
                  <div><Label>كلمة المرور الجديدة</Label><Input type="password" dir="ltr" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="6 أحرف على الأقل" data-testid="input-new-password" /></div>
                  <div><Label>تأكيد كلمة المرور</Label><Input type="password" dir="ltr" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} data-testid="input-confirm-password" /></div>
                </div>
                <Button onClick={handleChangePassword} disabled={changePassword.isPending} data-testid="button-change-password">
                  {changePassword.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} تغيير كلمة المرور
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> الاشتراك</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {subscription && subscription.status !== "inactive" && subscription.plan !== "free" ? (
                /* ===== Active subscription view ===== */
                <div className="space-y-6">
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

                  {/* Usage bars */}
                  {planData && (
                    <div className="p-4 rounded-md border space-y-4">
                      <p className="font-medium text-sm">الاستخدام</p>
                      {([
                        { key: "clients" as const, label: "العملاء" },
                        { key: "invoices" as const, label: "الفواتير" },
                        { key: "contracts" as const, label: "العقود" },
                        { key: "projects" as const, label: "المشاريع" },
                        { key: "documents" as const, label: "المستندات" },
                      ]).map(({ key, label }) => {
                        const used = planData.usage[key];
                        const limit = planData.limits[key];
                        const isUnlimited = !limit || limit === Infinity;
                        const percent = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{label}</span>
                              <span className="text-muted-foreground">
                                {used} / {isUnlimited ? "غير محدود" : limit}
                              </span>
                            </div>
                            {!isUnlimited && <Progress value={percent} className="h-2" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Feature badges */}
                  {planData && (
                    <div className="flex flex-wrap gap-3">
                      {([
                        { key: "signatures" as const, label: "التوقيع الإلكتروني" },
                        { key: "ai" as const, label: "الذكاء الاصطناعي" },
                        { key: "publicProfile" as const, label: "الصفحة العامة" },
                      ]).map(({ key, label }) => (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            planData.features[key]
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {planData.features[key] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button onClick={openPortal} disabled={portalLoading} data-testid="button-manage-subscription">
                    {portalLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إدارة الاشتراك
                  </Button>
                </div>
              ) : (
                /* ===== Free / no subscription view ===== */
                <div className="space-y-6">
                  {/* Free plan usage bars */}
                  {planData && (
                    <div className="p-4 rounded-md border space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">الباقة المجانية</p>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">الباقة الحالية</span>
                      </div>
                      {([
                        { key: "clients" as const, label: "العملاء" },
                        { key: "invoices" as const, label: "الفواتير" },
                        { key: "contracts" as const, label: "العقود" },
                        { key: "projects" as const, label: "المشاريع" },
                        { key: "documents" as const, label: "المستندات" },
                      ]).map(({ key, label }) => {
                        const used = planData.usage[key];
                        const limit = planData.limits[key];
                        const isUnlimited = !limit || limit === Infinity;
                        const percent = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{label}</span>
                              <span className="text-muted-foreground">
                                {used} / {isUnlimited ? "غير محدود" : limit}
                              </span>
                            </div>
                            {!isUnlimited && (
                              <Progress
                                value={percent}
                                className="h-2"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground text-center">اختر باقة للترقية مع تجربة مجانية 14 يوم</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Starter card */}
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="text-center">
                          <p className="font-bold text-lg">المبتدئ</p>
                          <p className="mt-2">
                            <span className="text-3xl font-bold">{PLANS.starter.priceHalalah! / 100}</span>{" "}
                            <span className="text-sm text-muted-foreground">ر.س/شهرياً</span>
                          </p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">العملاء:</span> <span className="font-medium">{PLANS.starter.limits.clients}</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">الفواتير:</span> <span className="font-medium">{PLANS.starter.limits.invoices}</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">العقود:</span> <span className="font-medium">{PLANS.starter.limits.contracts}</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">المشاريع:</span> <span className="font-medium">{PLANS.starter.limits.projects}</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">المستندات:</span> <span className="font-medium">{PLANS.starter.limits.documents}</span></div>
                        </div>
                        <div className="space-y-1.5 text-sm border-t pt-3">
                          <div className="flex items-center gap-1.5 text-green-600"><Check className="h-4 w-4" /> التوقيع الإلكتروني</div>
                          <div className="flex items-center gap-1.5 text-green-600"><Check className="h-4 w-4" /> صفحة عامة</div>
                          <div className="flex items-center gap-1.5 text-muted-foreground"><X className="h-4 w-4" /> الذكاء الاصطناعي</div>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => handleSubscribe("starter")} data-testid="button-subscribe-starter">
                          اشترك الآن
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Pro card */}
                    <Card className="border-primary border-2 relative">
                      <CardContent className="pt-6 space-y-4">
                        <div className="text-center">
                          <p className="font-bold text-lg text-primary">المحترف</p>
                          <p className="mt-2">
                            <span className="text-3xl font-bold">{(proMonthlyPrice / 100).toFixed(0)}</span>{" "}
                            <span className="text-sm text-muted-foreground">ر.س/شهرياً</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(proPricePerClient / 100).toFixed(1)} ر.س/عميل
                          </p>
                        </div>

                        {/* Client count slider */}
                        <div className="space-y-3 p-3 rounded-md bg-muted/50">
                          <div className="flex justify-between text-sm">
                            <span>عدد العملاء</span>
                            <span className="font-bold">{proClientCount} عميل</span>
                          </div>
                          <Slider
                            value={[proClientCount]}
                            onValueChange={(v) => setProClientCount(v[0])}
                            min={50}
                            max={1000}
                            step={10}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>50</span>
                            <span>1000</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {PRO_PRICING_TIERS.map((tier) => (
                              <button
                                key={tier.clients}
                                onClick={() => setProClientCount(tier.clients)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                  proClientCount === tier.clients
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "hover:bg-muted border-border"
                                }`}
                              >
                                {tier.clients}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">العملاء:</span> <span className="font-medium">{proClientCount}</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">الفواتير:</span> <span className="font-medium">غير محدود</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">العقود:</span> <span className="font-medium">غير محدود</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">المشاريع:</span> <span className="font-medium">غير محدود</span></div>
                          <div className="flex items-center gap-2"><span className="text-muted-foreground">المستندات:</span> <span className="font-medium">غير محدود</span></div>
                        </div>
                        <div className="space-y-1.5 text-sm border-t pt-3">
                          <div className="flex items-center gap-1.5 text-green-600"><Check className="h-4 w-4" /> التوقيع الإلكتروني</div>
                          <div className="flex items-center gap-1.5 text-green-600"><Check className="h-4 w-4" /> الذكاء الاصطناعي</div>
                          <div className="flex items-center gap-1.5 text-green-600"><Check className="h-4 w-4" /> صفحة عامة</div>
                        </div>
                        <Button className="w-full" onClick={() => handleSubscribe("pro")} data-testid="button-subscribe-pro">
                          اشترك الآن
                        </Button>
                      </CardContent>
                    </Card>
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
