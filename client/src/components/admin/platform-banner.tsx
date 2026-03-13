import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export default function PlatformBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: banner } = useQuery({
    queryKey: ["/api/platform/banner"],
    queryFn: () => apiRequest("GET", "/api/platform/banner").then(r => r.json()).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  if (!banner?.isActive || dismissed) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
      <span className="text-amber-800 dark:text-amber-300">
        <strong>{banner.title}</strong> — {banner.message}
      </span>
      <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
