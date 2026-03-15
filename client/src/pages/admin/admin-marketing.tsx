import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Megaphone, Search, Share2, Globe, Save, Code,
  Twitter, Instagram, Facebook, Linkedin, Youtube,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminTracking from "./admin-tracking";

interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterSite: string;
  keywords: string;
  googleVerification: string;
  bingVerification: string;
  customHeadTags: string;
}

interface SocialLinks {
  twitter: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  snapchat: string;
  whatsapp: string;
  website: string;
}

const DEFAULT_SEO: SeoSettings = {
  metaTitle: "مستندك | Mustanadak - منصة إدارة الأعمال",
  metaDescription: "مستندك - منصة إدارة أعمال شاملة للمستقلين وأصحاب المشاريع الصغيرة. أدِر عملاءك، عقودك، فواتيرك، ومشاريعك من مكان واحد.",
  ogTitle: "مستندك | Mustanadak - منصة إدارة الأعمال",
  ogDescription: "أدِر أعمالك كلها من مكان واحد - عملاء، عقود، فواتير، مشاريع",
  ogImage: "https://mostandoc.com/logo-horizontal.png",
  twitterCard: "summary_large_image",
  twitterSite: "",
  keywords: "إدارة أعمال، فواتير، عقود، مستقلين، مشاريع، توقيع إلكتروني، مستندك",
  googleVerification: "",
  bingVerification: "",
  customHeadTags: "",
};

const DEFAULT_SOCIAL: SocialLinks = {
  twitter: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  youtube: "",
  tiktok: "",
  snapchat: "",
  whatsapp: "",
  website: "",
};

export default function AdminMarketing() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [seo, setSeo] = useState<SeoSettings>(DEFAULT_SEO);
  const [social, setSocial] = useState<SocialLinks>(DEFAULT_SOCIAL);

  const { data: savedSettings } = useQuery<Record<string, unknown>>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiRequest("GET", "/api/admin/settings").then(r => r.json()),
  });

  useEffect(() => {
    if (savedSettings) {
      const s = savedSettings as Record<string, unknown>;
      if (s.seo) setSeo(prev => ({ ...prev, ...(s.seo as Partial<SeoSettings>) }));
      if (s.social) setSocial(prev => ({ ...prev, ...(s.social as Partial<SocialLinks>) }));
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", "/api/admin/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "تم حفظ الإعدادات" });
    },
    onError: () => {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    },
  });

  function saveSeo() {
    saveMutation.mutate({ ...savedSettings, seo });
  }

  function saveSocial() {
    saveMutation.mutate({ ...savedSettings, social });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          التسويق
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          إدارة أكواد التتبع، تحسين محركات البحث (SEO)، وروابط التواصل الاجتماعي
        </p>
      </div>

      <Tabs defaultValue="tracking" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracking" className="gap-2">
            <Code className="h-4 w-4" />
            أكواد التتبع
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Share2 className="h-4 w-4" />
            روابط التواصل
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Tracking Codes */}
        <TabsContent value="tracking" className="mt-6">
          <AdminTracking />
        </TabsContent>

        {/* Tab 2: SEO Settings */}
        <TabsContent value="seo" className="mt-6 space-y-6">
          {/* Basic Meta Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                العلامات الوصفية (Meta Tags)
              </CardTitle>
              <CardDescription>النصوص التي تظهر في نتائج محركات البحث</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>عنوان الموقع (Meta Title)</Label>
                <Input
                  value={seo.metaTitle}
                  onChange={(e) => setSeo(s => ({ ...s, metaTitle: e.target.value }))}
                  placeholder="عنوان الموقع في محركات البحث"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  يُفضل أن يكون أقل من 60 حرف — الحالي: {seo.metaTitle.length} حرف
                </p>
              </div>
              <div>
                <Label>وصف الموقع (Meta Description)</Label>
                <Textarea
                  value={seo.metaDescription}
                  onChange={(e) => setSeo(s => ({ ...s, metaDescription: e.target.value }))}
                  placeholder="وصف الموقع في محركات البحث"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  يُفضل أن يكون بين 120-160 حرف — الحالي: {seo.metaDescription.length} حرف
                </p>
              </div>
              <div>
                <Label>الكلمات المفتاحية (Keywords)</Label>
                <Input
                  value={seo.keywords}
                  onChange={(e) => setSeo(s => ({ ...s, keywords: e.target.value }))}
                  placeholder="كلمة1، كلمة2، كلمة3"
                />
                <p className="text-xs text-muted-foreground mt-1">افصل بين الكلمات بفاصلة</p>
              </div>
            </CardContent>
          </Card>

          {/* Open Graph */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Open Graph (مشاركة السوشل ميديا)
              </CardTitle>
              <CardDescription>الشكل الذي يظهر عند مشاركة الرابط في فيسبوك، تويتر، واتساب وغيرها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>عنوان OG</Label>
                <Input
                  value={seo.ogTitle}
                  onChange={(e) => setSeo(s => ({ ...s, ogTitle: e.target.value }))}
                  placeholder="العنوان عند المشاركة"
                />
              </div>
              <div>
                <Label>وصف OG</Label>
                <Textarea
                  value={seo.ogDescription}
                  onChange={(e) => setSeo(s => ({ ...s, ogDescription: e.target.value }))}
                  placeholder="الوصف عند المشاركة"
                  rows={2}
                />
              </div>
              <div>
                <Label>صورة OG</Label>
                <Input
                  value={seo.ogImage}
                  onChange={(e) => setSeo(s => ({ ...s, ogImage: e.target.value }))}
                  placeholder="https://mostandoc.com/og-image.png"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1">الحجم المثالي: 1200×630 بكسل</p>
              </div>
              <Separator />
              <div>
                <Label>Twitter Card</Label>
                <Input
                  value={seo.twitterCard}
                  onChange={(e) => setSeo(s => ({ ...s, twitterCard: e.target.value }))}
                  placeholder="summary_large_image"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>حساب تويتر (@username)</Label>
                <Input
                  value={seo.twitterSite}
                  onChange={(e) => setSeo(s => ({ ...s, twitterSite: e.target.value }))}
                  placeholder="@mostandoc"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Verification & Advanced */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                التحقق من محركات البحث
              </CardTitle>
              <CardDescription>أكواد التحقق من ملكية الموقع في Google و Bing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Google Search Console</Label>
                <Input
                  value={seo.googleVerification}
                  onChange={(e) => setSeo(s => ({ ...s, googleVerification: e.target.value }))}
                  placeholder="كود التحقق من Google"
                  dir="ltr"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Bing Webmaster</Label>
                <Input
                  value={seo.bingVerification}
                  onChange={(e) => setSeo(s => ({ ...s, bingVerification: e.target.value }))}
                  placeholder="كود التحقق من Bing"
                  dir="ltr"
                  className="font-mono text-sm"
                />
              </div>
              <Separator />
              <div>
                <Label>أكواد Head إضافية</Label>
                <Textarea
                  value={seo.customHeadTags}
                  onChange={(e) => setSeo(s => ({ ...s, customHeadTags: e.target.value }))}
                  placeholder={'<meta name="custom" content="value" />'}
                  dir="ltr"
                  className="font-mono text-xs min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  أكواد HTML إضافية تُحقن في {"<head>"} — مثل schema markup أو أكواد تحقق أخرى
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-start">
            <Button onClick={saveSeo} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 ml-2" />
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات SEO"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 3: Social Media Links */}
        <TabsContent value="social" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                حسابات التواصل الاجتماعي
              </CardTitle>
              <CardDescription>روابط حساباتكم على منصات التواصل الاجتماعي — تظهر في الفوتر والصفحات العامة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Twitter className="h-4 w-4" />
                    X (تويتر)
                  </Label>
                  <Input
                    value={social.twitter}
                    onChange={(e) => setSocial(s => ({ ...s, twitter: e.target.value }))}
                    placeholder="https://x.com/mostandoc"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    انستقرام
                  </Label>
                  <Input
                    value={social.instagram}
                    onChange={(e) => setSocial(s => ({ ...s, instagram: e.target.value }))}
                    placeholder="https://instagram.com/mostandoc"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4" />
                    فيسبوك
                  </Label>
                  <Input
                    value={social.facebook}
                    onChange={(e) => setSocial(s => ({ ...s, facebook: e.target.value }))}
                    placeholder="https://facebook.com/mostandoc"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    لينكد إن
                  </Label>
                  <Input
                    value={social.linkedin}
                    onChange={(e) => setSocial(s => ({ ...s, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/company/mostandoc"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Youtube className="h-4 w-4" />
                    يوتيوب
                  </Label>
                  <Input
                    value={social.youtube}
                    onChange={(e) => setSocial(s => ({ ...s, youtube: e.target.value }))}
                    placeholder="https://youtube.com/@mostandoc"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <span className="text-sm">🎵</span>
                    تيك توك
                  </Label>
                  <Input
                    value={social.tiktok}
                    onChange={(e) => setSocial(s => ({ ...s, tiktok: e.target.value }))}
                    placeholder="https://tiktok.com/@mostandoc"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <span className="text-sm">👻</span>
                    سناب شات
                  </Label>
                  <Input
                    value={social.snapchat}
                    onChange={(e) => setSocial(s => ({ ...s, snapchat: e.target.value }))}
                    placeholder="https://snapchat.com/add/mostandoc"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <span className="text-sm">💬</span>
                    واتساب
                  </Label>
                  <Input
                    value={social.whatsapp}
                    onChange={(e) => setSocial(s => ({ ...s, whatsapp: e.target.value }))}
                    placeholder="https://wa.me/966XXXXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>
              <Separator />
              <div>
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  الموقع الرسمي
                </Label>
                <Input
                  value={social.website}
                  onChange={(e) => setSocial(s => ({ ...s, website: e.target.value }))}
                  placeholder="https://mostandoc.com"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-start">
            <Button onClick={saveSocial} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 ml-2" />
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ روابط التواصل"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
