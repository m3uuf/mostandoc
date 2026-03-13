import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Globe, Shield, Mail, Puzzle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlatformSettings {
  platformName: string;
  platformLogo: string;
  features: {
    ai: boolean;
    signatures: boolean;
    templates: boolean;
    publicProfiles: boolean;
    contentLibrary: boolean;
  };
  security: {
    sessionDurationDays: number;
    maxLoginAttempts: number;
    requireEmailVerification: boolean;
  };
  email: {
    senderName: string;
    senderEmail: string;
  };
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "مستندك",
  platformLogo: "",
  features: {
    ai: true,
    signatures: true,
    templates: true,
    publicProfiles: true,
    contentLibrary: true,
  },
  security: {
    sessionDurationDays: 7,
    maxLoginAttempts: 5,
    requireEmailVerification: true,
  },
  email: {
    senderName: "مستندك",
    senderEmail: "noreply@mustandak.com",
  },
};

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);

  const { data: savedSettings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiRequest("GET", "/api/admin/settings").then(r => r.json()),
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...savedSettings,
        features: { ...DEFAULT_SETTINGS.features, ...savedSettings.features },
        security: { ...DEFAULT_SETTINGS.security, ...savedSettings.security },
        email: { ...DEFAULT_SETTINGS.email, ...savedSettings.email },
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: (data: PlatformSettings) =>
      apiRequest("PATCH", "/api/admin/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "تم حفظ الإعدادات" });
    },
  });

  function updateFeature(key: keyof PlatformSettings["features"], value: boolean) {
    setSettings(s => ({ ...s, features: { ...s.features, [key]: value } }));
  }

  function updateSecurity(key: keyof PlatformSettings["security"], value: any) {
    setSettings(s => ({ ...s, security: { ...s.security, [key]: value } }));
  }

  function updateEmail(key: keyof PlatformSettings["email"], value: string) {
    setSettings(s => ({ ...s, email: { ...s.email, [key]: value } }));
  }

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          إعدادات المنصة
        </h1>
        <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 ml-2" />
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            عام
          </CardTitle>
          <CardDescription>الإعدادات الأساسية للمنصة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>اسم المنصة</Label>
            <Input value={settings.platformName} onChange={(e) => setSettings(s => ({ ...s, platformName: e.target.value }))} />
          </div>
          <div>
            <Label>رابط الشعار</Label>
            <Input value={settings.platformLogo} onChange={(e) => setSettings(s => ({ ...s, platformLogo: e.target.value }))} placeholder="https://..." dir="ltr" />
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            الميزات
          </CardTitle>
          <CardDescription>تفعيل وتعطيل ميزات المنصة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: "ai" as const, label: "مساعد الكتابة AI", desc: "تفعيل المساعد الذكي في المحرر" },
            { key: "signatures" as const, label: "التوقيع الإلكتروني", desc: "تفعيل إرسال واستقبال التوقيعات" },
            { key: "templates" as const, label: "القوالب", desc: "تفعيل معرض القوالب الجاهزة" },
            { key: "publicProfiles" as const, label: "الصفحات العامة", desc: "تفعيل صفحات البورتفوليو العامة" },
            { key: "contentLibrary" as const, label: "مكتبة المحتوى", desc: "تفعيل حفظ واستعادة المحتوى المتكرر" },
          ]).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={settings.features[key]} onCheckedChange={(v) => updateFeature(key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            الأمان
          </CardTitle>
          <CardDescription>إعدادات الحماية والأمان</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>مدة الجلسة (بالأيام)</Label>
              <Input
                type="number"
                value={settings.security.sessionDurationDays}
                onChange={(e) => updateSecurity("sessionDurationDays", parseInt(e.target.value) || 7)}
              />
            </div>
            <div>
              <Label>الحد الأقصى لمحاولات الدخول</Label>
              <Input
                type="number"
                value={settings.security.maxLoginAttempts}
                onChange={(e) => updateSecurity("maxLoginAttempts", parseInt(e.target.value) || 5)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">التحقق من البريد الإلكتروني</p>
              <p className="text-xs text-muted-foreground">مطالبة المستخدمين بتأكيد بريدهم عند التسجيل</p>
            </div>
            <Switch
              checked={settings.security.requireEmailVerification}
              onCheckedChange={(v) => updateSecurity("requireEmailVerification", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            البريد الإلكتروني
          </CardTitle>
          <CardDescription>إعدادات إرسال البريد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>اسم المرسل</Label>
            <Input value={settings.email.senderName} onChange={(e) => updateEmail("senderName", e.target.value)} />
          </div>
          <div>
            <Label>بريد المرسل</Label>
            <Input value={settings.email.senderEmail} onChange={(e) => updateEmail("senderEmail", e.target.value)} dir="ltr" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
