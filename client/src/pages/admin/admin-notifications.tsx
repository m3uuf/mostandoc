import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, Send, Megaphone, AlertTriangle, Users, User, Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  targetUserId: string | null;
  targetUserName: string | null;
  sentByName: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Broadcast form
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");

  // Targeted form
  const [tTitle, setTTitle] = useState("");
  const [tMessage, setTMessage] = useState("");
  const [tUserId, setTUserId] = useState("");

  // Banner form
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerExpiry, setBannerExpiry] = useState("");

  // Email form
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSendAll, setEmailSendAll] = useState(false);

  const { data: notifications } = useQuery<AdminNotification[]>({
    queryKey: ["/api/admin/notifications"],
    queryFn: () => apiRequest("GET", "/api/admin/notifications").then(r => r.json()),
  });

  const { data: activeBanner } = useQuery({
    queryKey: ["/api/platform/banner"],
    queryFn: () => apiRequest("GET", "/api/platform/banner").then(r => r.json()).catch(() => null),
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: { title: string; message: string }) =>
      apiRequest("POST", "/api/admin/notifications/broadcast", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "تم إرسال الإشعار لجميع المستخدمين" });
      setBTitle("");
      setBMessage("");
    },
  });

  const sendMutation = useMutation({
    mutationFn: (data: { title: string; message: string; targetUserId: string }) =>
      apiRequest("POST", "/api/admin/notifications/send", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "تم إرسال الإشعار" });
      setTTitle("");
      setTMessage("");
      setTUserId("");
    },
  });

  const bannerMutation = useMutation({
    mutationFn: (data: { title: string; message: string; expiresAt?: string }) =>
      apiRequest("POST", "/api/admin/notifications/banner", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/platform/banner"] });
      toast({ title: "تم تحديث البانر" });
      setBannerTitle("");
      setBannerMessage("");
      setBannerExpiry("");
    },
  });

  const deactivateBanner = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/notifications/banner", { title: "", message: "", deactivate: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform/banner"] });
      toast({ title: "تم إيقاف البانر" });
    },
  });

  const emailMutation = useMutation({
    mutationFn: (data: { to?: string; subject: string; message: string; sendToAll?: boolean }) =>
      apiRequest("POST", "/api/admin/email/send", data).then(r => r.json()),
    onSuccess: (result: { sentCount: number; failedCount: number }) => {
      toast({ title: `تم إرسال ${result.sentCount} بريد إلكتروني${result.failedCount > 0 ? ` (${result.failedCount} فشل)` : ""}` });
      setEmailTo("");
      setEmailSubject("");
      setEmailMessage("");
      setEmailSendAll(false);
    },
    onError: () => {
      toast({ title: "فشل في إرسال البريد", variant: "destructive" });
    },
  });

  const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    broadcast: { label: "عام", icon: Megaphone, color: "bg-blue-100 text-blue-700" },
    targeted: { label: "مستهدف", icon: User, color: "bg-purple-100 text-purple-700" },
    banner: { label: "بانر", icon: AlertTriangle, color: "bg-amber-100 text-amber-700" },
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="h-6 w-6" />
        الإشعارات والتنبيهات
      </h1>

      {/* Active Banner */}
      {activeBanner && activeBanner.isActive && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium">{activeBanner.title}</p>
                <p className="text-sm text-muted-foreground">{activeBanner.message}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => deactivateBanner.mutate()}>
              إيقاف البانر
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="broadcast" dir="rtl">
        <TabsList>
          <TabsTrigger value="broadcast" className="gap-2"><Megaphone className="h-4 w-4" /> إشعار عام</TabsTrigger>
          <TabsTrigger value="targeted" className="gap-2"><User className="h-4 w-4" /> إشعار مستهدف</TabsTrigger>
          <TabsTrigger value="banner" className="gap-2"><AlertTriangle className="h-4 w-4" /> بانر المنصة</TabsTrigger>
          <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> إرسال بريد</TabsTrigger>
        </TabsList>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast">
          <Card>
            <CardHeader><CardTitle className="text-lg">إرسال إشعار لجميع المستخدمين</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>العنوان</Label>
                <Input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="تحديث جديد!" />
              </div>
              <div>
                <Label>الرسالة</Label>
                <Textarea value={bMessage} onChange={(e) => setBMessage(e.target.value)} placeholder="تفاصيل الإشعار..." rows={4} />
              </div>
              <Button
                onClick={() => broadcastMutation.mutate({ title: bTitle, message: bMessage })}
                disabled={!bTitle || !bMessage || broadcastMutation.isPending}
              >
                <Send className="h-4 w-4 ml-2" />
                {broadcastMutation.isPending ? "جاري الإرسال..." : "إرسال للجميع"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Targeted Tab */}
        <TabsContent value="targeted">
          <Card>
            <CardHeader><CardTitle className="text-lg">إرسال إشعار لمستخدم محدد</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>معرف المستخدم</Label>
                <Input value={tUserId} onChange={(e) => setTUserId(e.target.value)} placeholder="أدخل معرف المستخدم (UUID)" className="font-mono" />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="رسالة خاصة" />
              </div>
              <div>
                <Label>الرسالة</Label>
                <Textarea value={tMessage} onChange={(e) => setTMessage(e.target.value)} placeholder="تفاصيل الإشعار..." rows={4} />
              </div>
              <Button
                onClick={() => sendMutation.mutate({ title: tTitle, message: tMessage, targetUserId: tUserId })}
                disabled={!tTitle || !tMessage || !tUserId || sendMutation.isPending}
              >
                <Send className="h-4 w-4 ml-2" />
                {sendMutation.isPending ? "جاري الإرسال..." : "إرسال"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banner Tab */}
        <TabsContent value="banner">
          <Card>
            <CardHeader><CardTitle className="text-lg">بانر المنصة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">يظهر البانر أعلى المنصة لجميع المستخدمين</p>
              <div>
                <Label>العنوان</Label>
                <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} placeholder="صيانة مجدولة" />
              </div>
              <div>
                <Label>الرسالة</Label>
                <Textarea value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} placeholder="سيتم إجراء صيانة مجدولة..." rows={3} />
              </div>
              <div>
                <Label>تاريخ الانتهاء (اختياري)</Label>
                <Input type="datetime-local" value={bannerExpiry} onChange={(e) => setBannerExpiry(e.target.value)} />
              </div>
              <Button
                onClick={() => bannerMutation.mutate({
                  title: bannerTitle,
                  message: bannerMessage,
                  ...(bannerExpiry ? { expiresAt: new Date(bannerExpiry).toISOString() } : {}),
                })}
                disabled={!bannerTitle || !bannerMessage || bannerMutation.isPending}
              >
                <AlertTriangle className="h-4 w-4 ml-2" />
                {bannerMutation.isPending ? "جاري النشر..." : "نشر البانر"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Email Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader><CardTitle className="text-lg">إرسال بريد إلكتروني</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">إرسال بريد إلكتروني بهوية مستندك عبر Resend</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendAll"
                  checked={emailSendAll}
                  onCheckedChange={(v) => setEmailSendAll(!!v)}
                />
                <Label htmlFor="sendAll" className="text-sm">إرسال لجميع المستخدمين</Label>
              </div>
              {!emailSendAll && (
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="example@email.com"
                    type="email"
                    dir="ltr"
                  />
                </div>
              )}
              <div>
                <Label>الموضوع</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="موضوع البريد" />
              </div>
              <div>
                <Label>الرسالة</Label>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="محتوى الرسالة..."
                  rows={6}
                />
              </div>
              <Button
                onClick={() => emailMutation.mutate({
                  ...(emailSendAll ? { sendToAll: true } : { to: emailTo }),
                  subject: emailSubject,
                  message: emailMessage,
                })}
                disabled={!emailSubject || !emailMessage || (!emailSendAll && !emailTo) || emailMutation.isPending}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {emailMutation.isPending ? "جاري الإرسال..." : emailSendAll ? "إرسال للجميع" : "إرسال"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification History */}
      <Card>
        <CardHeader><CardTitle className="text-lg">سجل الإشعارات المرسلة</CardTitle></CardHeader>
        <CardContent>
          {!notifications?.length ? (
            <p className="text-center text-muted-foreground p-4">لا توجد إشعارات مرسلة</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const t = typeLabels[n.type] || typeLabels.broadcast;
                return (
                  <div key={n.id} className="flex items-start justify-between p-3 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className={`text-xs mt-0.5 ${t.color}`}>
                        {t.label}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{n.message}</p>
                        {n.targetUserName && (
                          <p className="text-xs text-muted-foreground mt-1">المستهدف: {n.targetUserName}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">
                        {n.createdAt ? format(new Date(n.createdAt), "yyyy/MM/dd HH:mm") : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{n.sentByName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
