import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoIcon from "@assets/Asset_1@4x_1771471809797.png";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      const res = await apiRequest("POST", "/api/auth/register", { email, password, firstName, lastName });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      loginMutation.mutate();
    } else {
      registerMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

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
                {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {isLogin ? "أدخل بياناتك لتسجيل الدخول" : "أنشئ حسابك للبدء في إدارة أعمالك"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">الاسم الأول</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="محمد"
                        required={!isLogin}
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

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? "أدخل كلمة المرور" : "6 أحرف على الأقل"}
                      required
                      minLength={isLogin ? 1 : 6}
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

                <Button type="submit" className="w-full" disabled={isPending} data-testid="button-auth-submit">
                  {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
                </span>
                <Button
                  variant="ghost"
                  className="px-1"
                  onClick={() => { setIsLogin(!isLogin); setEmail(""); setPassword(""); setFirstName(""); setLastName(""); }}
                  data-testid="button-switch-auth-mode"
                >
                  {isLogin ? "أنشئ حساب" : "سجّل دخول"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
