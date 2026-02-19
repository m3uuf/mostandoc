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

  return (
    <div className="min-h-screen bg-background">
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-bl from-[hsl(204,61%,28%)] via-[hsl(204,50%,20%)] to-[hsl(210,30%,12%)]" />
        <div className="relative container mx-auto px-4 py-16 text-center text-white">
          <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-white/20">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="text-2xl bg-white/10">{(profile.fullName || username)[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold mb-2">{profile.fullName || username}</h1>
          {profile.profession && <p className="text-lg opacity-90 mb-2">{professionLabels[profile.profession] || profile.profession}</p>}
          {profile.bio && <p className="max-w-xl mx-auto opacity-80 mb-4">{profile.bio}</p>}
          <div className="flex items-center justify-center gap-4 flex-wrap text-sm opacity-80">
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
                  <a key={key} href={key === "whatsapp" ? `https://wa.me/${url}` : url} target="_blank" className="p-2 rounded-full bg-white/10 hover-elevate">
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {services.filter((s) => s.isActive).length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-8">الخدمات</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {services.filter((s) => s.isActive).map((service) => (
              <Card key={service.id} className="hover-elevate" data-testid={`service-card-${service.id}`}>
                <CardContent className="p-5 text-center space-y-2">
                  <h3 className="font-semibold text-lg">{service.title}</h3>
                  {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                  <p className="font-bold text-primary">
                    {service.priceType === "negotiable" ? "تواصل للتسعير" : `${Number(service.price || 0).toLocaleString("ar-SA")} ر.س${service.priceType === "hourly" ? " / ساعة" : ""}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {portfolio.length > 0 && (
        <section className="bg-muted/30">
          <div className="container mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold text-center mb-8">معرض الأعمال</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {portfolio.map((item) => (
                <Card key={item.id} className="overflow-visible hover-elevate" data-testid={`portfolio-item-${item.id}`}>
                  <CardContent className="p-0">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-t-md" />}
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                      <div className="flex items-center justify-between gap-2">
                        {item.category && <Badge variant="secondary">{item.category}</Badge>}
                        {item.link && <a href={item.link} target="_blank" className="text-primary text-sm flex items-center gap-1"><ExternalLink className="h-3 w-3" /> عرض</a>}
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
        <h2 className="text-2xl font-bold text-center mb-8">تواصل معي</h2>
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 space-y-4">
            <div><Label>الاسم *</Label><Input value={contactForm.senderName} onChange={(e) => setContactForm({ ...contactForm, senderName: e.target.value })} data-testid="input-contact-name" /></div>
            <div><Label>البريد الإلكتروني *</Label><Input type="email" value={contactForm.senderEmail} onChange={(e) => setContactForm({ ...contactForm, senderEmail: e.target.value })} data-testid="input-contact-email" /></div>
            <div><Label>الرسالة *</Label><Textarea rows={4} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} data-testid="input-contact-message" /></div>
            <Button onClick={handleContact} disabled={sendMessage.isPending} className="w-full" data-testid="button-send-message">
              {sendMessage.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
              إرسال
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t bg-muted/30 py-6 text-center text-sm text-muted-foreground">
        <p>تم الإنشاء بواسطة <a href="/" className="text-primary underline">مستندك</a></p>
      </footer>
    </div>
  );
}
