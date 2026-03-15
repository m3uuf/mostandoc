import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, Receipt, FolderKanban, AlertTriangle, Clock, Mail, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Invoice, Contract } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم الإرسال", description: "تم إرسال رابط التفعيل إلى بريدك الإلكتروني" });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const { data: stats, isLoading } = useQuery<{
    clientCount: number;
    activeContractCount: number;
    pendingInvoiceCount: number;
    pendingInvoiceTotal: string;
    totalInvoiceCount: number;
    activeProjectCount: number;
  }>({ queryKey: ["/api/dashboard/stats"] });

  const { data: overdueInvoices } = useQuery<(Invoice & { clientName?: string })[]>({
    queryKey: ["/api/dashboard/overdue-invoices"],
  });

  const { data: expiringContracts } = useQuery<(Contract & { clientName?: string })[]>({
    queryKey: ["/api/dashboard/expiring-contracts"],
  });

  const statCards = [
    { title: "إجمالي العملاء", value: stats?.clientCount || 0, icon: Users, color: "text-blue-500" },
    { title: "إجمالي العقود", value: stats?.activeContractCount || 0, icon: FileText, color: "text-green-500" },
    { title: "إجمالي الفواتير", value: stats?.totalInvoiceCount || 0, icon: Receipt, color: "text-amber-500" },
    { title: "إجمالي المشاريع", value: stats?.activeProjectCount || 0, icon: FolderKanban, color: "text-purple-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-welcome">
        مرحباً، {user?.firstName || "مستخدم"}
      </h1>

      {user && !user.emailVerified && !bannerDismissed && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700" data-testid="banner-verify-email">
          <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              لم يتم تفعيل بريدك الإلكتروني بعد
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              تحقق من بريدك الإلكتروني واضغط على رابط التفعيل، أو أعد إرسال الرابط
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/50"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            data-testid="button-resend-verification"
          >
            {resendMutation.isPending && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
            إعادة إرسال
          </Button>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 shrink-0"
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color} shrink-0`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${card.title}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <CardTitle className="text-base">فواتير تحتاج متابعة</CardTitle>
          </CardHeader>
          <CardContent>
            {!overdueInvoices?.length ? (
              <p className="text-sm text-muted-foreground">لا توجد فواتير متأخرة</p>
            ) : (
              <div className="space-y-3">
                {overdueInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{inv.clientName || "بدون عميل"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{Number(inv.total).toLocaleString("ar-SA")} ر.س</span>
                      <Badge variant="destructive">متأخرة</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <CardTitle className="text-base">عقود تنتهي قريباً</CardTitle>
          </CardHeader>
          <CardContent>
            {!expiringContracts?.length ? (
              <p className="text-sm text-muted-foreground">لا توجد عقود تنتهي قريباً</p>
            ) : (
              <div className="space-y-3">
                {expiringContracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{contract.title}</p>
                      <p className="text-xs text-muted-foreground">{contract.clientName || "بدون عميل"}</p>
                    </div>
                    <Badge variant="secondary">ينتهي {contract.endDate}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
