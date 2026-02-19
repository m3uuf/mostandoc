import { useState, useEffect, useCallback } from "react";
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
import { useUpload } from "@/hooks/use-upload";
import { Globe, Plus, Pencil, Trash2, Loader2, ExternalLink, Mail, Eye, Upload, Lock, Image, X, Palette, ImageIcon } from "lucide-react";
import type { Profile, Service, PortfolioItem, ContactMessage } from "@shared/schema";

export default function MyPageManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({ queryKey: ["/api/profile"] });
  const { data: servicesList = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: portfolio = [] } = useQuery<PortfolioItem[]>({ queryKey: ["/api/portfolio"] });
  const { data: messages = [] } = useQuery<ContactMessage[]>({ queryKey: ["/api/messages"] });

  const profileExists = !!profile;

  const handleTabChange = (tab: string) => {
    if ((tab === "services" || tab === "portfolio") && !profileExists) {
      toast({ title: "يرجى إنشاء البروفايل أولاً قبل إضافة الخدمات أو الأعمال", variant: "destructive" });
      return;
    }
    setActiveTab(tab);
  };

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

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">البروفايل</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services" disabled={!profileExists} className="relative">
            {!profileExists && <Lock className="h-3 w-3 ml-1" />}
            الخدمات
          </TabsTrigger>
          <TabsTrigger value="portfolio" data-testid="tab-portfolio" disabled={!profileExists} className="relative">
            {!profileExists && <Lock className="h-3 w-3 ml-1" />}
            معرض الأعمال
          </TabsTrigger>
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

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi)$/i.test(url) || url.includes("video");
}

function FileUploadButton({ onUploaded, currentUrl, label, acceptTypes = "image/*,video/*" }: { onUploaded: (path: string) => void; currentUrl?: string; label: string; acceptTypes?: string }) {
  const [uploading, setUploading] = useState(false);
  const [lastFileType, setLastFileType] = useState<string>("");
  const { uploadFile } = useUpload({
    onSuccess: (response) => {
      onUploaded(response.objectPath);
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLastFileType(file.type);
    await uploadFile(file);
    e.target.value = "";
  };

  const isVideo = currentUrl ? (isVideoUrl(currentUrl) || lastFileType.startsWith("video/")) : false;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {currentUrl && (
        <div className="relative w-full h-32 rounded-md overflow-hidden border">
          {isVideo ? (
            <video src={currentUrl} className="w-full h-full object-cover" controls muted />
          ) : (
            <img src={currentUrl} alt="preview" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" disabled={uploading} asChild>
          <label className="cursor-pointer" data-testid="button-upload-file">
            {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
            {uploading ? "جاري الرفع..." : "رفع ملف"}
            <input type="file" className="hidden" accept={acceptTypes} onChange={handleFileSelect} disabled={uploading} />
          </label>
        </Button>
        {currentUrl && (
          <Button variant="ghost" size="sm" onClick={() => onUploaded("")} data-testid="button-remove-file">
            <X className="ml-1 h-3 w-3" /> إزالة
          </Button>
        )}
      </div>
    </div>
  );
}

const PRESET_COLORS = [
  { label: "أزرق داكن", value: "#1B4F72" },
  { label: "أزرق فاتح", value: "#2E86C1" },
  { label: "أخضر", value: "#27AE60" },
  { label: "برتقالي", value: "#E8752A" },
  { label: "بنفسجي", value: "#8E44AD" },
  { label: "أحمر", value: "#C0392B" },
  { label: "فيروزي", value: "#1ABC9C" },
  { label: "رمادي", value: "#2C3E50" },
  { label: "ذهبي", value: "#D4A017" },
  { label: "وردي", value: "#E91E63" },
];

function ColorPicker({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`w-8 h-8 rounded-md border-2 transition-all ${value === c.value ? "border-foreground scale-110" : "border-transparent"}`}
            style={{ backgroundColor: c.value }}
            title={c.label}
            data-testid={`color-${c.value.replace("#", "")}`}
          />
        ))}
        <div className="flex items-center gap-1">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-md cursor-pointer border-0 p-0"
            data-testid={testId}
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 text-xs font-mono"
            maxLength={7}
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}

function HeroPreview({ form }: { form: any }) {
  const headerStyle = form.headerStyle || "gradient";
  const primaryColor = form.primaryColor || "#1B4F72";
  const accentColor = form.accentColor || "#2E86C1";

  const heroStyle: React.CSSProperties = {};
  if (headerStyle === "gradient") {
    heroStyle.background = `linear-gradient(to bottom left, ${primaryColor}, ${accentColor}50, ${primaryColor}dd)`;
  } else if (headerStyle === "solid") {
    heroStyle.backgroundColor = primaryColor;
  } else if (headerStyle === "image" && form.coverImageUrl) {
    heroStyle.backgroundImage = `url(${form.coverImageUrl})`;
    heroStyle.backgroundSize = "cover";
    heroStyle.backgroundPosition = "center";
  } else if (headerStyle === "minimal") {
    heroStyle.background = "transparent";
  }

  const isDark = headerStyle !== "minimal";
  const textClass = isDark ? "text-white" : "text-foreground";

  return (
    <div className="rounded-md overflow-hidden border" data-testid="hero-preview">
      <div className="relative" style={{ ...heroStyle, minHeight: 120 }}>
        {headerStyle === "image" && form.coverImageUrl && (
          <div className="absolute inset-0 bg-black/50" />
        )}
        <div className={`relative p-4 text-center ${textClass}`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            {form.logoUrl && (
              <img src={form.logoUrl} alt="logo" className="h-8 w-8 rounded-md object-cover" />
            )}
            {form.avatarUrl && (
              <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden">
                <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <p className="font-bold text-sm">{form.fullName || "اسمك هنا"}</p>
          <p className="text-xs opacity-80">{form.bio ? form.bio.substring(0, 50) + "..." : "نبذة مختصرة عنك"}</p>
          <div className="mt-2">
            <span
              className="inline-block px-3 py-1 rounded-md text-xs font-medium text-white"
              style={{ backgroundColor: form.buttonStyle === "outlined" ? "transparent" : accentColor, border: form.buttonStyle === "outlined" ? `1px solid ${accentColor}` : "none", color: form.buttonStyle === "outlined" ? accentColor : "white" }}
            >
              تواصل معي
            </span>
          </div>
        </div>
      </div>
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
    primaryColor: profile?.primaryColor || "#1B4F72",
    accentColor: profile?.accentColor || "#2E86C1",
    headerStyle: profile?.headerStyle || "gradient",
    coverImageUrl: profile?.coverImageUrl || "",
    themeMode: profile?.themeMode || "light",
    buttonStyle: profile?.buttonStyle || "filled",
    logoUrl: profile?.logoUrl || "",
    avatarUrl: profile?.avatarUrl || "",
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
        primaryColor: profile.primaryColor || "#1B4F72",
        accentColor: profile.accentColor || "#2E86C1",
        headerStyle: profile.headerStyle || "gradient",
        coverImageUrl: profile.coverImageUrl || "",
        themeMode: profile.themeMode || "light",
        buttonStyle: profile.buttonStyle || "filled",
        logoUrl: profile.logoUrl || "",
        avatarUrl: profile.avatarUrl || "",
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile && (
            <div className="bg-accent/10 border border-accent/30 rounded-md p-3 text-sm text-accent-foreground" data-testid="text-profile-required-notice">
              أنشئ بروفايلك أولاً لتتمكن من إضافة الخدمات ومعرض الأعمال
            </div>
          )}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" /> الهوية البصرية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadButton
                  label="الصورة الشخصية"
                  currentUrl={form.avatarUrl || undefined}
                  onUploaded={(path) => update("avatarUrl", path)}
                  acceptTypes="image/*"
                />
                <FileUploadButton
                  label="الشعار (Logo)"
                  currentUrl={form.logoUrl || undefined}
                  onUploaded={(path) => update("logoUrl", path)}
                  acceptTypes="image/*"
                />
              </div>

              <ColorPicker label="اللون الأساسي" value={form.primaryColor} onChange={(v) => update("primaryColor", v)} testId="input-primary-color" />
              <ColorPicker label="لون الأزرار والروابط" value={form.accentColor} onChange={(v) => update("accentColor", v)} testId="input-accent-color" />

              <div>
                <Label>نمط الغلاف</Label>
                <Select value={form.headerStyle} onValueChange={(v) => update("headerStyle", v)}>
                  <SelectTrigger data-testid="select-header-style"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradient">تدرج لوني</SelectItem>
                    <SelectItem value="solid">لون موحد</SelectItem>
                    <SelectItem value="image">صورة غلاف</SelectItem>
                    <SelectItem value="minimal">بسيط (بدون خلفية)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.headerStyle === "image" && (
                <FileUploadButton
                  label="صورة الغلاف"
                  currentUrl={form.coverImageUrl || undefined}
                  onUploaded={(path) => update("coverImageUrl", path)}
                  acceptTypes="image/*"
                />
              )}

              <div>
                <Label>نمط الأزرار</Label>
                <Select value={form.buttonStyle} onValueChange={(v) => update("buttonStyle", v)}>
                  <SelectTrigger data-testid="select-button-style"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filled">ملوّن</SelectItem>
                    <SelectItem value="outlined">محيّط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>ثيم الصفحة</Label>
                <Select value={form.themeMode} onValueChange={(v) => update("themeMode", v)}>
                  <SelectTrigger data-testid="select-theme-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتح</SelectItem>
                    <SelectItem value="dark">داكن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Eye className="h-4 w-4" /> معاينة مباشرة</Label>
              <HeroPreview form={form} />
              <p className="text-xs text-muted-foreground text-center">معاينة تقريبية - شاهد صفحتك الفعلية بعد الحفظ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full md:w-auto" data-testid="button-save-profile">
        {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حفظ البروفايل
      </Button>
    </div>
  );
}

function ServicesTab({ services }: { services: Service[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", priceType: "fixed", imageUrl: "" });
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

  const openCreate = () => { setEditingId(null); setForm({ title: "", description: "", price: "", priceType: "fixed", imageUrl: "" }); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditingId(s.id); setForm({ title: s.title, description: s.description || "", price: s.price || "", priceType: s.priceType || "fixed", imageUrl: (s as any).imageUrl || "" }); setDialogOpen(true); };
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
                  <div className="flex gap-3 items-start flex-1 min-w-0">
                    {(s as any).imageUrl && (
                      <img src={(s as any).imageUrl} alt={s.title} className="w-16 h-16 object-cover rounded-md shrink-0" />
                    )}
                    <div className="min-w-0"><h3 className="font-semibold">{s.title}</h3>{s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}</div>
                  </div>
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
            <div><Label>عنوان الخدمة *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-service-title" /></div>
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-service-description" /></div>
            <div>
              <Label>نوع التسعير</Label>
              <Select value={form.priceType} onValueChange={(v) => setForm({ ...form, priceType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">ثابت</SelectItem><SelectItem value="hourly">بالساعة</SelectItem><SelectItem value="negotiable">تواصل للتسعير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.priceType !== "negotiable" && <div><Label>السعر</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="input-service-price" /></div>}
            <FileUploadButton
              label="صورة الخدمة"
              currentUrl={form.imageUrl || undefined}
              onUploaded={(path) => setForm({ ...form, imageUrl: path })}
              acceptTypes="image/*"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-service">حفظ</Button>
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
                <div className="flex items-center gap-2 flex-wrap">
                  {item.category && <Badge variant="secondary">{item.category}</Badge>}
                  {item.link && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" data-testid={`link-portfolio-${item.id}`}>
                        <ExternalLink className="ml-1 h-3 w-3" /> عرض
                      </a>
                    </Button>
                  )}
                </div>
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
            <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-portfolio-title" /></div>
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-portfolio-description" /></div>
            <FileUploadButton
              label="صورة أو فيديو العمل"
              currentUrl={form.imageUrl || undefined}
              onUploaded={(path) => setForm({ ...form, imageUrl: path })}
            />
            <div><Label>رابط المشروع</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." data-testid="input-portfolio-link" /></div>
            <div><Label>التصنيف</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="input-portfolio-category" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-portfolio">حفظ</Button>
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
