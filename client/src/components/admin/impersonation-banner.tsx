import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { UserCog, LogOut } from "lucide-react";

export default function ImpersonationBanner() {
  const qc = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["/api/auth/session"],
    queryFn: () => apiRequest("GET", "/api/auth/session").then(r => r.json()).catch(() => null),
  });

  const exitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/impersonate/exit"),
    onSuccess: () => {
      window.location.href = "/dashboard/admin/users";
    },
  });

  if (!session?.isImpersonating) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <UserCog className="h-4 w-4" />
      <span>أنت تشاهد كـ <strong>{session.impersonatedName || "مستخدم"}</strong></span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-amber-500 border-white bg-white hover:bg-amber-50"
        onClick={() => exitMutation.mutate()}
      >
        <LogOut className="h-3 w-3 ml-1" />
        خروج
      </Button>
    </div>
  );
}
