import { Link, useLocation, Switch, Route } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3, Users, FileText, LayoutTemplate, CreditCard,
  Bell, Settings, ScrollText, ArrowRight, Code,
} from "lucide-react";
import AdminOverview from "./admin-overview";
import AdminUsers from "./admin-users";
import AdminDocuments from "./admin-documents";
import AdminTemplates from "./admin-templates";
import AdminSubscriptions from "./admin-subscriptions";
import AdminNotifications from "./admin-notifications";
import AdminSettings from "./admin-settings";
import AdminAuditLog from "./admin-audit-log";
import AdminTracking from "./admin-tracking";

const adminNav = [
  { title: "نظرة عامة", url: "/dashboard/admin", icon: BarChart3 },
  { title: "المستخدمون", url: "/dashboard/admin/users", icon: Users },
  { title: "المستندات", url: "/dashboard/admin/documents", icon: FileText },
  { title: "القوالب", url: "/dashboard/admin/templates", icon: LayoutTemplate },
  { title: "الاشتراكات", url: "/dashboard/admin/subscriptions", icon: CreditCard },
  { title: "الإشعارات", url: "/dashboard/admin/notifications", icon: Bell },
  { title: "أكواد التتبع", url: "/dashboard/admin/tracking", icon: Code },
  { title: "الإعدادات", url: "/dashboard/admin/settings", icon: Settings },
  { title: "سجل النشاطات", url: "/dashboard/admin/audit-log", icon: ScrollText },
];

export default function AdminLayout() {
  const [location] = useLocation();

  return (
    <div className="flex h-full">
      {/* Admin Sidebar Navigation */}
      <aside className="w-56 shrink-0 border-l bg-muted/30 overflow-y-auto">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="h-4 w-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
        </div>
        <div className="p-3">
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 px-2">لوحة الإدارة</h2>
          <nav className="space-y-1">
            {adminNav.map((item) => {
              const isActive = location === item.url ||
                (item.url !== "/dashboard/admin" && location.startsWith(item.url));
              return (
                <Link key={item.url} href={item.url}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/dashboard/admin" component={AdminOverview} />
          <Route path="/dashboard/admin/users" component={AdminUsers} />
          <Route path="/dashboard/admin/documents" component={AdminDocuments} />
          <Route path="/dashboard/admin/templates" component={AdminTemplates} />
          <Route path="/dashboard/admin/subscriptions" component={AdminSubscriptions} />
          <Route path="/dashboard/admin/notifications" component={AdminNotifications} />
          <Route path="/dashboard/admin/tracking" component={AdminTracking} />
          <Route path="/dashboard/admin/settings" component={AdminSettings} />
          <Route path="/dashboard/admin/audit-log" component={AdminAuditLog} />
        </Switch>
      </div>
    </div>
  );
}
