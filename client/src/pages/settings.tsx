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
import { Settings, Loader2, Sun, Moon } from "lucide-react";
import type { Profile } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: profile } = useQuery<Profile | null>({ queryKey: ["/api/profile"] });

  const [billingForm, setBillingForm] = useState({
    companyName: profile?.companyName || "",
    companyAddress: profile?.companyAddress || "",
    taxNumber: profile?.taxNumber || "",
  });

  const saveBilling = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "تم حفظ بيانات الفوترة" });
    },
  });

  useEffect(() => {
    if (profile) {
      setBillingForm({
        companyName: profile.companyName || "",
        companyAddress: profile.companyAddress || "",
        taxNumber: profile.taxNumber || "",
      });
    }
  }, [profile]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> الإعدادات</h1>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">الحساب</TabsTrigger>
          <TabsTrigger value="billing">بيانات الفوترة</TabsTrigger>
          <TabsTrigger value="appearance">المظهر</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle>معلومات الحساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>الاسم الأول</Label><Input value={user?.firstName || ""} readOnly className="bg-muted" /></div>
                <div><Label>اسم العائلة</Label><Input value={user?.lastName || ""} readOnly className="bg-muted" /></div>
                <div><Label>البريد الإلكتروني</Label><Input value={user?.email || ""} readOnly className="bg-muted" /></div>
              </div>
              <p className="text-sm text-muted-foreground">لتعديل معلومات حسابك، يرجى تعديلها من إعدادات حسابك في Replit.</p>
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
