import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, ChevronRight, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  "user.create": "إنشاء مستخدم",
  "user.update": "تحديث مستخدم",
  "user.delete": "حذف مستخدم",
  "user.suspend": "تعليق مستخدم",
  "user.activate": "تنشيط مستخدم",
  "user.role_change": "تغيير دور",
  "user.impersonate": "انتحال هوية",
  "user.impersonate_exit": "خروج من الانتحال",
  "document.delete": "حذف مستند",
  "template.create": "إنشاء قالب",
  "template.update": "تعديل قالب",
  "template.delete": "حذف قالب",
  "notification.broadcast": "إرسال إشعار عام",
  "notification.send": "إرسال إشعار",
  "notification.banner": "بانر المنصة",
  "settings.update": "تحديث الإعدادات",
  "coupon.create": "إنشاء كوبون",
  "coupon.update": "تعديل كوبون",
  "coupon.delete": "حذف كوبون",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  suspend: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  impersonate: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function getActionColor(action: string) {
  for (const [key, value] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return value;
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
}

export default function AdminAuditLog() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ["/api/admin/audit-logs", page, actionFilter, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      return apiRequest("GET", `/api/admin/audit-logs?${params}`).then(r => r.json());
    },
  });

  const entries = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ScrollText className="h-6 w-6" />
        سجل النشاطات
      </h1>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="نوع العملية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمليات</SelectItem>
                <SelectItem value="user">عمليات المستخدمين</SelectItem>
                <SelectItem value="document">عمليات المستندات</SelectItem>
                <SelectItem value="template">عمليات القوالب</SelectItem>
                <SelectItem value="notification">عمليات الإشعارات</SelectItem>
                <SelectItem value="settings">عمليات الإعدادات</SelectItem>
                <SelectItem value="coupon">عمليات الكوبونات</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[160px]"
              dir="ltr"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="من تاريخ"
            />
            <Input
              type="date"
              className="w-[160px]"
              dir="ltr"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              placeholder="إلى تاريخ"
            />
            {(actionFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setActionFilter("all");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}>مسح الفلاتر</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right p-3 font-medium">الوقت</th>
                  <th className="text-right p-3 font-medium">المنفذ</th>
                  <th className="text-right p-3 font-medium">العملية</th>
                  <th className="text-right p-3 font-medium">الهدف</th>
                  <th className="text-right p-3 font-medium">التفاصيل</th>
                  <th className="text-right p-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">جاري التحميل...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">لا توجد سجلات</td></tr>
                ) : entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {entry.createdAt ? format(new Date(entry.createdAt), "yyyy/MM/dd HH:mm:ss") : "-"}
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="text-sm font-medium">{entry.actorName || "-"}</p>
                        <p className="text-xs text-muted-foreground">{entry.actorEmail || ""}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-xs ${getActionColor(entry.action)}`}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {entry.targetType && (
                        <span className="text-muted-foreground">
                          {entry.targetType}
                          {entry.targetId && ` #${entry.targetId.slice(0, 8)}`}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {entry.details ? JSON.stringify(entry.details) : "-"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{entry.ipAddress || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
