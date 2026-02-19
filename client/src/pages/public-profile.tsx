import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Mail, Phone, Globe, Send, Loader2, ExternalLink } from "lucide-react";
import { SiLinkedin, SiX, SiInstagram, SiWhatsapp } from "react-icons/si";
import type { Profile, Service, PortfolioItem } from "@shared/schema";

const professionLabels: Record<string, string> = {
  design: "تصميم", development: "برمجة", marketing: "تسويق", consulting: "استشارات",
  photography: "تصوير", writing: "كتابة", other: "أخرى",
};

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function PublicProfile() {
  const [, params] = useRoute("/p/:username");
  const username = params?.username || "";
  const { toast } = useToast();
  const [contactForm, setContactForm] = useState({ senderName: "", senderEmail: "", message: "" });

  const { data, isLoading, error } = useQuery<{ profile: Profile; services: Service[]; portfolio: PortfolioItem[] }>({
    queryKey: ["/api/public", username],
    enabled: !!username,
  });

  const sendMessage = useMutation({
    mutationFn: (formData: any) => apiRequest("POST", `/api/public/${username}/contact`, formData),
    onSuccess: () => {
      setContactForm({ senderName: "", senderEmail: "", message: "" });
      toast({ title: "تم إرسال رسالتك بنجاح" });
    },
    onError: () => { toast({ title: "فشل في إرسال الرسالة", variant: "destructive" }); },
  });

  const handleContact = () => {
    if (!contactForm.senderName.trim() || !contactForm.senderEmail.trim() || !contactForm.message.trim()) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    sendMessage.mutate(contactForm);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !data) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">الصفحة غير موجودة</div>;

  const { profile, services, portfolio } = data;
  const socialLinks = (profile.socialLinks || {}) as Record<string, string>;
  const socialIcons: Record<string, any> = { twitter: SiX, linkedin: SiLinkedin, instagram: SiInstagram, whatsapp: SiWhatsapp };

  const primaryColor = profile.primaryColor || "#1B4F72";
  const accentColor = profile.accentColor || "#2E86C1";
  const headerStyle = profile.headerStyle || "gradient";
  const coverImageUrl = profile.coverImageUrl || "";
  const themeMode = profile.themeMode || "light";
  const buttonStyle = profile.buttonStyle || "filled";
  const logoUrl = profile.logoUrl || "";
  const avatarUrl = profile.avatarUrl || "";

  const isDarkTheme = themeMode === "dark";
  const pageBg = isDarkTheme ? "bg-[#0f172a]" : "bg-background";
  const pageText = isDarkTheme ? "text-gray-100" : "text-foreground";
  const pageMuted = isDarkTheme ? "text-gray-400" : "text-muted-foreground";
  const cardBg = isDarkTheme ? "bg-[#1e293b] border-[#334155]" : "";
  const sectionBg = isDarkTheme ? "bg-[#162032]" : "bg-muted/30";
  const footerBg = isDarkTheme ? "bg-[#0c1424] border-[#1e293b]" : "bg-muted/30";

  const heroStyle: React.CSSProperties = {};
  const effectiveHeaderStyle = (headerStyle === "image" && !coverImageUrl) ? "gradient" : headerStyle;
  const isHeroDark = effectiveHeaderStyle !== "minimal";
  if (effectiveHeaderStyle === "gradient") {
    const pHsl = hexToHSL(primaryColor);
    heroStyle.background = `linear-gradient(to bottom left, ${primaryColor}, hsl(${pHsl.h}, ${pHsl.s}%, ${Math.max(pHsl.l - 15, 5)}%), ${primaryColor}dd)`;
  } else if (effectiveHeaderStyle === "solid") {
    heroStyle.backgroundColor = primaryColor;
  } else if (effectiveHeaderStyle === "image" && coverImageUrl) {
    heroStyle.backgroundImage = `url(${coverImageUrl})`;
    heroStyle.backgroundSize = "cover";
    heroStyle.backgroundPosition = "center";
  } else if (effectiveHeaderStyle === "minimal") {
    heroStyle.background = isDarkTheme ? "#1e293b" : "#f8fafc";
  }

  const heroTextClass = isHeroDark ? "text-white" : (isDarkTheme ? "text-gray-100" : "text-foreground");
  const heroMutedClass = isHeroDark ? "opacity-80" : pageMuted;

  const btnBaseStyle: React.CSSProperties = buttonStyle === "outlined"
    ? { border: `2px solid ${accentColor}`, color: accentColor, backgroundColor: "transparent" }
    : { backgroundColor: accentColor, color: "#fff", border: "none" };

  const activeServices = services.filter((s) => s.isActive);

  return (
    <div className={`min-h-screen ${pageBg} ${pageText}`}>
      <section className="relative" data-testid="hero-section">
        <div className="absolute inset-0" style={heroStyle} data-testid="hero-background" />
        {effectiveHeaderStyle === "image" && coverImageUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        )}
        <div className={`relative container mx-auto px-4 py-16 text-center ${heroTextClass}`}>
          <div className="flex items-center justify-center gap-4 mb-4">
            {logoUrl && (
              <img src={logoUrl} alt="logo" className="h-12 w-12 rounded-md object-cover border-2 border-white/20" data-testid="img-logo" />
            )}
            <Avatar className="h-24 w-24 border-4 border-white/20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-white/10">{(profile.fullName || username)[0]}</AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-profile-name">{profile.fullName || username}</h1>
          {profile.profession && <p className={`text-lg mb-2 ${heroMutedClass}`}>{professionLabels[profile.profession] || profile.profession}</p>}
          {profile.bio && <p className={`max-w-xl mx-auto mb-4 ${heroMutedClass}`}>{profile.bio}</p>}
          <div className={`flex items-center justify-center gap-4 flex-wrap text-sm ${heroMutedClass}`}>
            {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.location}</span>}
            {profile.emailPublic && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {profile.emailPublic}</span>}
            {profile.phonePublic && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {profile.phonePublic}</span>}
            {profile.website && <a href={profile.website} target="_blank" className="flex items-center gap-1 underline"><Globe className="h-4 w-4" /> الموقع</a>}
          </div>
          {Object.keys(socialLinks).length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              {Object.entries(socialLinks).map(([key, url]) => {
                if (!url) return null;
                const Icon = socialIcons[key];
                if (!Icon) return null;
                return (
                  <a key={key} href={key === "whatsapp" ? `https://wa.me/${url}` : url} target="_blank"
                    className="p-2 rounded-full bg-white/10 hover-elevate" data-testid={`social-${key}`}>
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {activeServices.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: isDarkTheme ? "#e2e8f0" : undefined }}>الخدمات</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {activeServices.map((service) => (
              <Card key={service.id} className={`hover-elevate ${cardBg}`} data-testid={`service-card-${service.id}`}>
                <CardContent className="p-5 text-center space-y-2">
                  {(service as any).imageUrl && (
                    <img src={(service as any).imageUrl} alt={service.title} className="w-full h-32 object-cover rounded-md mb-2" />
                  )}
                  <h3 className="font-semibold text-lg">{service.title}</h3>
                  {service.description && <p className={`text-sm ${pageMuted}`}>{service.description}</p>}
                  <p className="font-bold" style={{ color: accentColor }}>
                    {service.priceType === "negotiable" ? "تواصل للتسعير" : `${Number(service.price || 0).toLocaleString("ar-SA")} ر.س${service.priceType === "hourly" ? " / ساعة" : ""}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {portfolio.length > 0 && (
        <section className={sectionBg}>
          <div className="container mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ color: isDarkTheme ? "#e2e8f0" : undefined }}>معرض الأعمال</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {portfolio.map((item) => (
                <Card key={item.id} className={`overflow-visible hover-elevate ${cardBg}`} data-testid={`portfolio-item-${item.id}`}>
                  <CardContent className="p-0">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-t-md" />}
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.description && <p className={`text-sm ${pageMuted} line-clamp-2`}>{item.description}</p>}
                      <div className="flex items-center justify-between gap-2">
                        {item.category && <Badge variant="secondary">{item.category}</Badge>}
                        {item.link && <a href={item.link} target="_blank" style={{ color: accentColor }} className="text-sm flex items-center gap-1"><ExternalLink className="h-3 w-3" /> عرض</a>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: isDarkTheme ? "#e2e8f0" : undefined }}>تواصل معي</h2>
        <Card className={`max-w-lg mx-auto ${cardBg}`}>
          <CardContent className="p-6 space-y-4">
            <div><Label>الاسم *</Label><Input value={contactForm.senderName} onChange={(e) => setContactForm({ ...contactForm, senderName: e.target.value })} data-testid="input-contact-name" className={isDarkTheme ? "bg-[#0f172a] border-[#334155]" : ""} /></div>
            <div><Label>البريد الإلكتروني *</Label><Input type="email" value={contactForm.senderEmail} onChange={(e) => setContactForm({ ...contactForm, senderEmail: e.target.value })} data-testid="input-contact-email" className={isDarkTheme ? "bg-[#0f172a] border-[#334155]" : ""} /></div>
            <div><Label>الرسالة *</Label><Textarea rows={4} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} data-testid="input-contact-message" className={isDarkTheme ? "bg-[#0f172a] border-[#334155]" : ""} /></div>
            <Button
              onClick={handleContact}
              disabled={sendMessage.isPending}
              className="w-full"
              style={btnBaseStyle}
              data-testid="button-send-message"
            >
              {sendMessage.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
              إرسال
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className={`border-t py-6 text-center text-sm ${pageMuted} ${footerBg}`}>
        <p>تم الإنشاء بواسطة <a href="/" style={{ color: accentColor }} className="underline">مستندك</a></p>
      </footer>
    </div>
  );
}
