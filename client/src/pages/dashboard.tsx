import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Receipt, FolderKanban, AlertTriangle, Clock } from "lucide-react";
import type { Invoice, Contract } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<{
    clientCount: number;
    activeContractCount: number;
    pendingInvoiceCount: number;
    pendingInvoiceTotal: string;
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
    { title: "العقود النشطة", value: stats?.activeContractCount || 0, icon: FileText, color: "text-green-500" },
    { title: "فواتير معلقة", value: `${stats?.pendingInvoiceCount || 0} (${Number(stats?.pendingInvoiceTotal || 0).toLocaleString("ar-SA")} ر.س)`, icon: Receipt, color: "text-amber-500" },
    { title: "المشاريع الجارية", value: stats?.activeProjectCount || 0, icon: FolderKanban, color: "text-purple-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-welcome">
        مرحباً، {user?.firstName || "مستخدم"}
      </h1>

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
