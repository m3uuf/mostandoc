import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, FileText, Receipt, FolderKanban, Globe, Settings, Bell, LogOut, ChevronDown, FilePenLine, ShieldCheck, LayoutTemplate
} from "lucide-react";
import logoIcon from "@assets/Asset_1@4x_1771471809797.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { title: "لوحة التحكم", url: "/dashboard", icon: LayoutDashboard },
  { title: "العملاء", url: "/dashboard/clients", icon: Users },
  { title: "العقود", url: "/dashboard/contracts", icon: FileText },
  { title: "الفواتير", url: "/dashboard/invoices", icon: Receipt },
  { title: "المشاريع", url: "/dashboard/projects", icon: FolderKanban },
  { title: "المستندات", url: "/dashboard/documents", icon: FilePenLine },
  { title: "القوالب", url: "/dashboard/templates", icon: LayoutTemplate },
  { title: "صفحتي العامة", url: "/dashboard/my-page", icon: Globe },
  { title: "الإعدادات", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });

  const unreadCount = notifData?.count || 0;
  const initials = user ? `${(user.firstName || "م")[0]}${(user.lastName || "")[0] || ""}` : "م";

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" data-testid="link-logo">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="مستندك" className="w-8 h-8 rounded-md object-cover" />
            <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">مستندك</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url} data-testid={`link-${item.url.split('/').pop()}`}>
                        <item.icon className="shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard/notifications"} tooltip="الإشعارات">
                  <Link href="/dashboard/notifications" data-testid="link-notifications">
                    <div className="relative shrink-0">
                      <Bell />
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                    <span>الإشعارات</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(user?.role === "admin" || user?.role === "superadmin") && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.startsWith("/dashboard/admin")} tooltip="لوحة الأدمن">
                    <Link href="/dashboard/admin" data-testid="link-admin">
                      <ShieldCheck className="shrink-0 text-purple-500" />
                      <span className="text-purple-600 dark:text-purple-400 font-medium">لوحة الأدمن</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 w-full rounded-md p-2 hover-elevate" data-testid="button-user-menu">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-right group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" data-testid="link-settings-dropdown">
                <Settings className="ml-2 h-4 w-4" />
                الإعدادات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()} data-testid="button-logout">
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
