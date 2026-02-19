import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCheck, Loader2, FileText, Receipt, Mail, FolderKanban } from "lucide-react";
import type { Notification } from "@shared/schema";

const iconMap: Record<string, any> = {
  invoice_overdue: Receipt,
  contract_expiring: FileText,
  new_message: Mail,
  task_due: FolderKanban,
  payment_received: Receipt,
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({ queryKey: ["/api/notifications"] });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "تم تعليم جميع الإشعارات كمقروءة" });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const timeAgo = (date: Date | null) => {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> الإشعارات</h1>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} data-testid="button-mark-all-read">
            <CheckCheck className="ml-2 h-4 w-4" /> تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !notifications.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد إشعارات</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = iconMap[notif.type] || Bell;
            return (
              <Card key={notif.id} className={!notif.isRead ? "border-primary/30" : ""} data-testid={`notification-${notif.id}`}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${notif.isRead ? "text-muted-foreground" : "text-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{notif.title}</p>
                      {!notif.isRead && <Badge variant="destructive" className="text-[10px]">جديد</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {!notif.isRead && (
                    <Button size="icon" variant="ghost" onClick={() => markRead.mutate(notif.id)}>
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
