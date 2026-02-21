import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, Eye, EyeOff, Mail, ArrowRight } from "lucide-react";
import { SiGoogle, SiFacebook, SiApple } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoIcon from "@assets/Asset_1@4x_1771471809797.png";

type AuthMode = "login" | "register" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providers } = useQuery<{ google: boolean; facebook: boolean; apple: boolean }>({
    queryKey: ["/api/auth/providers"],
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل في تسجيل الدخول");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/register", { email, password, firstName, lastName, phone });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل في إنشاء الحساب");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل في إرسال الرابط");
      }
      return res.json();
    },
    onSuccess: () => {
      setForgotSent(true);
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate();
    } else if (mode === "register") {
      registerMutation.mutate();
    } else {
      forgotMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending || forgotMutation.isPending;

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setForgotSent(false);
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  const title = mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء حساب جديد" : "نسيت كلمة المرور";
  const subtitle = mode === "login" ? "أدخل بياناتك لتسجيل الدخول" : mode === "register" ? "أنشئ حسابك للبدء في إدارة أعمالك" : "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور";

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#3B5FE5] via-[#2a45b0] to-[#1a2d6e]" />
        <div className="relative flex flex-col items-center justify-center w-full p-12 text-white text-center">
          <img src={logoIcon} alt="مستندك" className="w-20 h-20 rounded-xl mb-6 object-cover" />
          <h1 className="text-4xl font-bold mb-4">مستندك</h1>
          <p className="text-xl opacity-90 max-w-md">
            منصة متكاملة لإدارة أعمالك — العملاء، العقود، الفواتير، والمشاريع
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-2 mb-8">
            <div className="flex items-center gap-2 lg:hidden">
              <img src={logoIcon} alt="مستندك" className="w-8 h-8 rounded-md object-cover" />
              <span className="font-bold text-lg">مستندك</span>
            </div>
            <ThemeToggle />
          </div>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-1 text-center" data-testid="text-auth-title">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {subtitle}
              </p>

              {mode === "forgot" && forgotSent ? (
                <div className="text-center space-y-4" data-testid="forgot-password-sent">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تفقّد بريدك الوارد.
                  </p>
                  <Button variant="ghost" onClick={() => switchMode("login")} data-testid="button-back-to-login">
                    <ArrowRight className="w-4 h-4 ml-2" />
                    العودة لتسجيل الدخول
                  </Button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "register" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">الاسم الأول</Label>
                            <Input
                              id="firstName"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="محمد"
                              required
                              data-testid="input-first-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">الاسم الأخير</Label>
                            <Input
                              id="lastName"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="العلي"
                              data-testid="input-last-name"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">رقم الجوال</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+966 5XX XXX XXXX"
                            dir="ltr"
                            data-testid="input-phone"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        required
                        dir="ltr"
                        data-testid="input-email"
                      />
                    </div>

                    {mode !== "forgot" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <Label htmlFor="password">كلمة المرور</Label>
                          {mode === "login" && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="px-0 h-auto text-xs text-primary hover:bg-transparent"
                              onClick={() => switchMode("forgot")}
                              data-testid="button-forgot-password"
                            >
                              نسيت كلمة المرور؟
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === "login" ? "أدخل كلمة المرور" : "6 أحرف على الأقل"}
                            required
                            minLength={mode === "login" ? 1 : 6}
                            dir="ltr"
                            className="pl-10"
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isPending} data-testid="button-auth-submit">
                      {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      {mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء الحساب" : "إرسال رابط إعادة التعيين"}
                    </Button>
                  </form>

                  {mode !== "forgot" && (providers?.google || providers?.facebook || providers?.apple) && (
                    <>
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">أو</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {providers?.google && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleSocialLogin("google")}
                            data-testid="button-login-google"
                          >
                            <SiGoogle className="ml-2 h-4 w-4" />
                            {mode === "login" ? "تسجيل الدخول بحساب Google" : "التسجيل بحساب Google"}
                          </Button>
                        )}
                        {providers?.facebook && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleSocialLogin("facebook")}
                            data-testid="button-login-facebook"
                          >
                            <SiFacebook className="ml-2 h-4 w-4 text-[#1877F2]" />
                            {mode === "login" ? "تسجيل الدخول بحساب Facebook" : "التسجيل بحساب Facebook"}
                          </Button>
                        )}
                        {providers?.apple && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleSocialLogin("apple")}
                            data-testid="button-login-apple"
                          >
                            <SiApple className="ml-2 h-4 w-4" />
                            {mode === "login" ? "تسجيل الدخول بحساب Apple" : "التسجيل بحساب Apple"}
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-6 text-center text-sm">
                    {mode === "forgot" ? (
                      <Button
                        variant="ghost"
                        className="px-1"
                        onClick={() => switchMode("login")}
                        data-testid="button-back-to-login"
                      >
                        <ArrowRight className="w-4 h-4 ml-1" />
                        العودة لتسجيل الدخول
                      </Button>
                    ) : (
                      <>
                        <span className="text-muted-foreground">
                          {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
                        </span>
                        <Button
                          variant="ghost"
                          className="px-1"
                          onClick={() => switchMode(mode === "login" ? "register" : "login")}
                          data-testid="button-switch-auth-mode"
                        >
                          {mode === "login" ? "أنشئ حساب" : "سجّل دخول"}
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
