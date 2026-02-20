import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ContractsPage from "@/pages/contracts";
import InvoicesPage from "@/pages/invoices";
import ProjectsPage from "@/pages/projects";
import MyPageManager from "@/pages/my-page";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";
import PublicProfile from "@/pages/public-profile";
import { Loader2 } from "lucide-react";

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <ThemeToggle />
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/dashboard/clients" component={ClientsPage} />
              <Route path="/dashboard/contracts" component={ContractsPage} />
              <Route path="/dashboard/invoices" component={InvoicesPage} />
              <Route path="/dashboard/projects" component={ProjectsPage} />
              <Route path="/dashboard/my-page" component={MyPageManager} />
              <Route path="/dashboard/settings" component={SettingsPage} />
              <Route path="/dashboard/notifications" component={NotificationsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return (
      <Switch>
        <Route path="/p/:username" component={PublicProfile} />
        <Route path="/auth/reset-password" component={ResetPasswordPage} />
        <Route path="/"><Redirect to="/dashboard" /></Route>
        <Route path="/auth"><Redirect to="/dashboard" /></Route>
        <Route path="/dashboard/:rest*" component={AuthenticatedLayout} />
        <Route path="/dashboard" component={AuthenticatedLayout} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/p/:username" component={PublicProfile} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard/:rest*"><Redirect to="/auth" /></Route>
      <Route path="/dashboard"><Redirect to="/auth" /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
