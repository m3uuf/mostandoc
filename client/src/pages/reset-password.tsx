import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoIcon from "@assets/Asset_1@4x_1771471809797.png";

export default function ResetPasswordPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: validation, isLoading: validating } = useQuery<{ valid: boolean }>({
    queryKey: ["/api/auth/reset-password/validate", token],
    queryFn: async () => {
      const res = await fetch(`/api/auth/reset-password/validate?token=${token}`);
      return res.json();
    },
    enabled: !!token,
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) {
        throw new Error("كلمات المرور غير متطابقة");
      }
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل في إعادة التعيين");
      }
      return res.json();
    },
    onSuccess: () => {
      setResetDone(true);
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">رابط غير صالح</h2>
            <p className="text-muted-foreground text-sm">الرابط المستخدم غير صالح أو منتهي الصلاحية.</p>
            <Button onClick={() => navigate("/auth")} data-testid="button-go-login">
              العودة لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between gap-2 mb-8">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="مستندك" className="w-8 h-8 rounded-md object-cover" />
            <span className="font-bold text-lg">مستندك</span>
          </div>
          <ThemeToggle />
        </div>

        <Card>
          <CardContent className="pt-6">
            {validating ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-4">جارِ التحقق من الرابط...</p>
              </div>
            ) : !validation?.valid ? (
              <div className="text-center space-y-4">
                <XCircle className="w-16 h-16 text-destructive mx-auto" />
                <h2 className="text-xl font-bold">رابط غير صالح</h2>
                <p className="text-muted-foreground text-sm">الرابط المستخدم غير صالح أو منتهي الصلاحية.</p>
                <Button onClick={() => navigate("/auth")} data-testid="button-go-login">
                  العودة لتسجيل الدخول
                </Button>
              </div>
            ) : resetDone ? (
              <div className="text-center space-y-4" data-testid="reset-password-success">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold">تم بنجاح</h2>
                <p className="text-muted-foreground text-sm">تم إعادة تعيين كلمة المرور. يمكنك الآن تسجيل الدخول.</p>
                <Button onClick={() => navigate("/auth")} data-testid="button-go-login">
                  تسجيل الدخول
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-1 text-center" data-testid="text-reset-title">
                  إعادة تعيين كلمة المرور
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  أدخل كلمة المرور الجديدة
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6 أحرف على الأقل"
                        required
                        minLength={6}
                        dir="ltr"
                        className="pl-10"
                        data-testid="input-new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      required
                      minLength={6}
                      dir="ltr"
                      data-testid="input-confirm-password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={resetMutation.isPending} data-testid="button-reset-submit">
                    {resetMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إعادة تعيين كلمة المرور
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
