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
import VerifyEmailPage from "@/pages/verify-email";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ContractsPage from "@/pages/contracts";
import InvoicesPage from "@/pages/invoices";
import ProjectsPage from "@/pages/projects";
import MyPageManager from "@/pages/my-page";
import SettingsPage from "@/pages/settings";
import NotificationsPage from "@/pages/notifications";
import PublicProfile from "@/pages/public-profile";
import DocumentsPage from "@/pages/documents";
import DocumentEditor from "@/pages/document-editor";
import SignDocument from "@/pages/sign-document";
import TextDocumentEditor from "@/pages/text-document-editor";
import AdminMigratePage from "@/pages/admin-migrate";
import AdminLayout from "@/pages/admin/admin-layout";
import TemplatesGallery from "@/pages/templates-gallery";
import ImpersonationBanner from "@/components/admin/impersonation-banner";
import TrackingScriptsInjector from "@/components/tracking-scripts-injector";
import GlobalSearch from "@/components/global-search";
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
            <GlobalSearch />
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <ImpersonationBanner />
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
              <Route path="/dashboard/templates">{() => <TemplatesGallery embedded />}</Route>
              <Route path="/dashboard/documents/text/:id" component={TextDocumentEditor} />
              <Route path="/dashboard/documents/(.*)" component={DocumentEditor} />
              <Route path="/dashboard/documents" component={DocumentsPage} />
              <Route path="/dashboard/admin/migrate" component={AdminMigratePage} />
              <Route path="/dashboard/admin/(.*)" component={AdminLayout} />
              <Route path="/dashboard/admin" component={AdminLayout} />
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
        <Route path="/templates" component={TemplatesGallery} />
        <Route path="/p/:username" component={PublicProfile} />
        <Route path="/sign/:token" component={SignDocument} />
        <Route path="/auth/reset-password" component={ResetPasswordPage} />
        <Route path="/auth/verify-email" component={VerifyEmailPage} />
        <Route path="/"><Redirect to="/dashboard" /></Route>
        <Route path="/auth"><Redirect to="/dashboard" /></Route>
        <Route path="/dashboard/(.*)" component={AuthenticatedLayout} />
        <Route path="/dashboard" component={AuthenticatedLayout} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // If not logged in, redirect to mostandoc.com (main site)
  const isAppSubdomain = window.location.hostname.startsWith("app.");
  const mainSiteUrl = isAppSubdomain
    ? window.location.origin.replace("app.", "")
    : "https://mostandoc.com";

  return (
    <Switch>
      <Route path="/templates" component={TemplatesGallery} />
      <Route path="/p/:username" component={PublicProfile} />
      <Route path="/sign/:token" component={SignDocument} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/verify-email" component={VerifyEmailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/">{() => {
        if (isAppSubdomain) {
          window.location.href = mainSiteUrl;
          return null;
        }
        return <Landing />;
      }}</Route>
      <Route path="/dashboard/(.*)">{() => {
        if (isAppSubdomain) {
          window.location.href = mainSiteUrl;
          return null;
        }
        return <Redirect to="/auth" />;
      }}</Route>
      <Route path="/dashboard">{() => {
        if (isAppSubdomain) {
          window.location.href = mainSiteUrl;
          return null;
        }
        return <Redirect to="/auth" />;
      }}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <TrackingScriptsInjector />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
