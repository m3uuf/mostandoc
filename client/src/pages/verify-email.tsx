import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
const logoIcon = "/favicon.png";


export default function VerifyEmailPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("رابط التفعيل غير صالح");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "تم تفعيل البريد الإلكتروني بنجاح");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } else {
          setStatus("error");
          setMessage(data.message || "فشل في تفعيل البريد الإلكتروني");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("فشل في الاتصال بالخادم");
      });
  }, [token]);

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
            {status === "loading" ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-4">جارِ تفعيل البريد الإلكتروني...</p>
              </div>
            ) : status === "success" ? (
              <div className="text-center space-y-4" data-testid="verify-email-success">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold">تم التفعيل بنجاح</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
                <Button onClick={() => navigate("/dashboard")} data-testid="button-go-dashboard">
                  الذهاب للوحة التحكم
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4" data-testid="verify-email-error">
                <XCircle className="w-16 h-16 text-destructive mx-auto" />
                <h2 className="text-xl font-bold">فشل التفعيل</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
                <Button onClick={() => navigate("/auth")} data-testid="button-go-login">
                  العودة لتسجيل الدخول
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
