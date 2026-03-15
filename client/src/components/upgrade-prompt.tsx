import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Lock } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  type: "limit" | "feature";
  resource?: string; // e.g. "العملاء", "الفواتير"
  feature?: string; // e.g. "التوقيع الإلكتروني", "الذكاء الاصطناعي"
  current?: number;
  limit?: number;
}

export default function UpgradePrompt({ type, resource, feature, current, limit }: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  return (
    <Alert className="border-[#E8752A]/30 bg-[#E8752A]/5 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {type === "limit" ? (
            <ArrowUpCircle className="h-5 w-5 text-[#E8752A]" />
          ) : (
            <Lock className="h-5 w-5 text-[#E8752A]" />
          )}
          <AlertDescription className="text-sm">
            {type === "limit"
              ? `وصلت للحد الأقصى من ${resource} (${current}/${limit}). رقِّ باقتك لإضافة المزيد.`
              : `${feature} غير متوفرة في باقتك الحالية.`
            }
          </AlertDescription>
        </div>
        <Button
          size="sm"
          className="bg-[#3B5FE5] hover:bg-[#2d4bc4] whitespace-nowrap"
          onClick={() => setLocation("/dashboard/settings")}
        >
          ترقية الباقة
        </Button>
      </div>
    </Alert>
  );
}
