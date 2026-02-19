import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Users, FileText, Receipt, FolderKanban, Globe, ArrowLeft, CheckCircle } from "lucide-react";

const features = [
  { icon: Users, title: "إدارة العملاء", desc: "أضف وتابع عملاءك بسهولة مع معلومات التواصل والملاحظات" },
  { icon: FileText, title: "العقود الاحترافية", desc: "أنشئ عقوداً من قوالب جاهزة وصدّرها كـ PDF" },
  { icon: Receipt, title: "الفواتير والضرائب", desc: "فواتير احترافية مع حساب ضريبة القيمة المضافة تلقائياً" },
  { icon: FolderKanban, title: "إدارة المشاريع", desc: "تابع مشاريعك ومهامك بلوحة كانبان تفاعلية" },
  { icon: Globe, title: "صفحة عامة", desc: "صفحة بورتفوليو احترافية تشاركها مع عملائك" },
];

const steps = [
  { num: "١", title: "سجّل حسابك", desc: "أنشئ حسابك في ثوانٍ" },
  { num: "٢", title: "أضف عملاءك", desc: "أضف بيانات عملائك ومشاريعك" },
  { num: "٣", title: "أدِر أعمالك", desc: "تابع كل شيء من مكان واحد" },
];

const plans = [
  { name: "مجاني", price: "0", period: "مجاناً للأبد", features: ["5 عملاء", "10 فواتير شهرياً", "3 مشاريع", "صفحة عامة أساسية"], cta: "ابدأ مجاناً" },
  { name: "بروفيشنال", price: "49", period: "ر.س / شهرياً", features: ["عملاء غير محدودين", "فواتير غير محدودة", "مشاريع غير محدودة", "قوالب عقود", "تصدير PDF"], cta: "اشترك الآن", popular: true },
  { name: "أعمال", price: "99", period: "ر.س / شهرياً", features: ["كل مميزات بروفيشنال", "فريق عمل (حتى 5)", "تقارير متقدمة", "دعم أولوي", "ربط API"], cta: "تواصل معنا" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[hsl(204,63%,47%)] flex items-center justify-center text-white font-bold text-sm">م</div>
            <span className="font-bold text-lg">مستندك</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <a href="/api/login" data-testid="button-login">تسجيل الدخول</a>
            </Button>
            <Button asChild>
              <a href="/api/login" data-testid="button-register">ابدأ مجاناً</a>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-[hsl(204,61%,28%)] via-[hsl(204,50%,20%)] to-[hsl(210,30%,12%)]" />
        <div className="relative container mx-auto px-4 py-20 md:py-32 text-center text-white">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            أدِر أعمالك كلها من مكان واحد
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
            منصة متكاملة للمستقلين وأصحاب المشاريع الصغيرة لإدارة العملاء والعقود والفواتير والمشاريع باحترافية
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" className="bg-[hsl(22,79%,54%)] border-[hsl(22,79%,54%)]" asChild>
              <a href="/api/login" data-testid="button-hero-cta">
                ابدأ مجاناً
                <ArrowLeft className="mr-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">كل ما تحتاجه لإدارة أعمالك</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="text-center hover-elevate">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/50">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">كيف يعمل؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">{s.num}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">اختر الخطة المناسبة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary shadow-md relative" : ""}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default">الأكثر طلباً</Badge>
                </div>
              )}
              <CardContent className="pt-6 text-center">
                <h3 className="font-bold text-lg mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mr-1">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.popular ? "default" : "outline"} className="w-full" asChild>
                  <a href="/api/login" data-testid={`button-plan-${plan.name}`}>{plan.cta}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-[hsl(204,63%,47%)] flex items-center justify-center text-white font-bold text-xs">م</div>
            <span className="font-semibold text-foreground">مستندك</span>
          </div>
          <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} مستندك</p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ variant, className, children }: { variant: string; className?: string; children: React.ReactNode }) {
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground ${className}`}>{children}</span>;
}
