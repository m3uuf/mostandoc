import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Pencil, Trash2, Loader2, ExternalLink, Mail, Eye } from "lucide-react";
import type { Profile, Service, PortfolioItem, ContactMessage } from "@shared/schema";

export default function MyPageManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({ queryKey: ["/api/profile"] });
  const { data: servicesList = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: portfolio = [] } = useQuery<PortfolioItem[]>({ queryKey: ["/api/portfolio"] });
  const { data: messages = [] } = useQuery<ContactMessage[]>({ queryKey: ["/api/messages"] });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6" /> صفحتي العامة</h1>
        {profile?.username && (
          <Button variant="outline" asChild>
            <a href={`/p/${profile.username}`} target="_blank" data-testid="button-preview-page">
              <ExternalLink className="ml-2 h-4 w-4" /> معاينة صفحتي
            </a>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">البروفايل</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">الخدمات</TabsTrigger>
          <TabsTrigger value="portfolio" data-testid="tab-portfolio">معرض الأعمال</TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">
            الرسائل
            {messages.filter((m) => !m.isRead).length > 0 && (
              <Badge variant="destructive" className="mr-1 h-5 px-1.5 text-[10px]">{messages.filter((m) => !m.isRead).length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileTab profile={profile} isLoading={profileLoading} /></TabsContent>
        <TabsContent value="services"><ServicesTab services={servicesList} /></TabsContent>
        <TabsContent value="portfolio"><PortfolioTab items={portfolio} /></TabsContent>
        <TabsContent value="messages"><MessagesTab messages={messages} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({ profile, isLoading }: { profile: Profile | null | undefined; isLoading: boolean }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    username: profile?.username || "", fullName: profile?.fullName || "", bio: profile?.bio || "",
    profession: profile?.profession || "", location: profile?.location || "",
    emailPublic: profile?.emailPublic || "", phonePublic: profile?.phonePublic || "",
    website: profile?.website || "", isPublic: profile?.isPublic ?? true,
    socialLinks: profile?.socialLinks || {},
  });

  const update = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username || "", fullName: profile.fullName || "", bio: profile.bio || "",
        profession: profile.profession || "", location: profile.location || "",
        emailPublic: profile.emailPublic || "", phonePublic: profile.phonePublic || "",
        website: profile.website || "", isPublic: profile.isPublic ?? true,
        socialLinks: profile.socialLinks || {},
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest(profile ? "PATCH" : "POST", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "تم حفظ البروفايل بنجاح" });
    },
    onError: (err: Error) => { toast({ title: err.message.includes("مستخدم") ? "اسم المستخدم مستخدم بالفعل" : "فشل في حفظ البروفايل", variant: "destructive" }); },
  });

  const handleSave = () => {
    if (!form.username.trim()) { toast({ title: "اسم المستخدم مطلوب", variant: "destructive" }); return; }
    saveMutation.mutate(form);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>اسم المستخدم (رابط صفحتك) *</Label><Input value={form.username} onChange={(e) => update("username", e.target.value)} data-testid="input-username" /><p className="text-xs text-muted-foreground mt-1">{window.location.origin}/p/{form.username}</p></div>
          <div><Label>الاسم الكامل</Label><Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} data-testid="input-fullname" /></div>
          <div><Label>المهنة</Label>
            <Select value={form.profession} onValueChange={(v) => update("profession", v)}>
              <SelectTrigger><SelectValue placeholder="اختر المجال" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="design">تصميم</SelectItem><SelectItem value="development">برمجة</SelectItem>
                <SelectItem value="marketing">تسويق</SelectItem><SelectItem value="consulting">استشارات</SelectItem>
                <SelectItem value="photography">تصوير</SelectItem><SelectItem value="writing">كتابة</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>الموقع</Label><Input value={form.location} onChange={(e) => update("location", e.target.value)} /></div>
          <div><Label>الإيميل (يظهر في صفحتك)</Label><Input value={form.emailPublic} onChange={(e) => update("emailPublic", e.target.value)} /></div>
          <div><Label>الجوال (يظهر في صفحتك)</Label><Input value={form.phonePublic} onChange={(e) => update("phonePublic", e.target.value)} /></div>
          <div><Label>الموقع الإلكتروني</Label><Input value={form.website} onChange={(e) => update("website", e.target.value)} /></div>
        </div>
        <div><Label>النبذة</Label><Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} data-testid="input-bio" /></div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => update("isPublic", e.target.checked)} id="isPublic" className="h-4 w-4" />
          <Label htmlFor="isPublic">تفعيل الصفحة العامة</Label>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-profile">
          {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ البروفايل
        </Button>
      </CardContent>
    </Card>
  );
}

function ServicesTab({ services }: { services: Service[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", priceType: "fixed" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/services", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/services"] }); setDialogOpen(false); toast({ title: "تم إضافة الخدمة" }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/services/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/services"] }); setDialogOpen(false); setEditingId(null); toast({ title: "تم تحديث الخدمة" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/services"] }); toast({ title: "تم حذف الخدمة" }); },
  });

  const openCreate = () => { setEditingId(null); setForm({ title: "", description: "", price: "", priceType: "fixed" }); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditingId(s.id); setForm({ title: s.title, description: s.description || "", price: s.price || "", priceType: s.priceType || "fixed" }); setDialogOpen(true); };
  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editingId) updateMutation.mutate({ id: editingId, data: form }); else createMutation.mutate(form);
  };

  const priceTypeLabels: Record<string, string> = { fixed: "ثابت", hourly: "بالساعة", negotiable: "تواصل للتسعير" };

  return (
    <div className="space-y-4">
      <Button onClick={openCreate} data-testid="button-add-service"><Plus className="ml-2 h-4 w-4" /> إضافة خدمة</Button>
      {!services.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد خدمات. أضف خدماتك لعرضها في صفحتك العامة.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><h3 className="font-semibold">{s.title}</h3>{s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <p className="text-sm mt-2 font-medium">
                  {s.priceType === "negotiable" ? "تواصل للتسعير" : `${Number(s.price || 0).toLocaleString("ar-SA")} ر.س ${s.priceType === "hourly" ? "/ ساعة" : ""}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "تعديل الخدمة" : "إضافة خدمة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>عنوان الخدمة *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>نوع التسعير</Label>
              <Select value={form.priceType} onValueChange={(v) => setForm({ ...form, priceType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">ثابت</SelectItem><SelectItem value="hourly">بالساعة</SelectItem><SelectItem value="negotiable">تواصل للتسعير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.priceType !== "negotiable" && <div><Label>السعر</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PortfolioTab({ items }: { items: PortfolioItem[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", imageUrl: "", link: "", category: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/portfolio", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] }); setDialogOpen(false); toast({ title: "تم إضافة العمل" }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/portfolio/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] }); setDialogOpen(false); setEditingId(null); toast({ title: "تم تحديث العمل" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/portfolio/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] }); toast({ title: "تم حذف العمل" }); },
  });

  const openCreate = () => { setEditingId(null); setForm({ title: "", description: "", imageUrl: "", link: "", category: "" }); setDialogOpen(true); };
  const openEdit = (item: PortfolioItem) => { setEditingId(item.id); setForm({ title: item.title, description: item.description || "", imageUrl: item.imageUrl || "", link: item.link || "", category: item.category || "" }); setDialogOpen(true); };
  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editingId) updateMutation.mutate({ id: editingId, data: form }); else createMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <Button onClick={openCreate} data-testid="button-add-portfolio"><Plus className="ml-2 h-4 w-4" /> إضافة عمل</Button>
      {!items.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد أعمال. أضف أعمالك السابقة لعرضها.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-2">
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover rounded-md" />}
                <h3 className="font-semibold">{item.title}</h3>
                {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                {item.category && <Badge variant="secondary">{item.category}</Badge>}
                <div className="flex items-center gap-1 pt-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "تعديل العمل" : "إضافة عمل"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>رابط الصورة</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
            <div><Label>رابط المشروع</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
            <div><Label>التصنيف</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessagesTab({ messages }: { messages: ContactMessage[] }) {
  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/messages/${id}/read`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/messages"] }); },
  });

  if (!messages.length) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد رسائل واردة بعد.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <Card key={msg.id} className={!msg.isRead ? "border-primary/30" : ""} data-testid={`message-${msg.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Mail className={`h-4 w-4 ${msg.isRead ? "text-muted-foreground" : "text-primary"}`} />
                <span className="font-semibold text-sm">{msg.senderName}</span>
                <span className="text-xs text-muted-foreground">{msg.senderEmail}</span>
                {!msg.isRead && <Badge variant="destructive" className="text-[10px]">جديدة</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">{msg.createdAt ? new Date(msg.createdAt).toLocaleDateString("ar-SA") : ""}</span>
            </div>
            <p className="text-sm mt-2">{msg.message}</p>
            {!msg.isRead && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => markReadMutation.mutate(msg.id)}>
                <Eye className="ml-1 h-3 w-3" /> تعليم كمقروءة
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
