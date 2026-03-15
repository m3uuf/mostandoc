import { useQuery } from "@tanstack/react-query";

interface PlanLimitsResponse {
  plan: string;
  limits: {
    clients: number;
    invoices: number;
    contracts: number;
    projects: number;
    documents: number;
  };
  usage: {
    clients: number;
    invoices: number;
    contracts: number;
    projects: number;
    documents: number;
  };
  features: {
    signatures: boolean;
    ai: boolean;
    publicProfile: boolean;
  };
  clientLimit: number | null;
}

export function usePlanLimits() {
  const { data, isLoading, error } = useQuery<PlanLimitsResponse>({
    queryKey: ["/api/subscription/limits"],
    staleTime: 30000, // 30 seconds
  });

  const canCreate = (resource: "clients" | "invoices" | "contracts" | "projects" | "documents"): boolean => {
    if (!data) return true; // Allow if still loading
    const limit = data.limits[resource];
    if (limit === null || limit === undefined) return true; // No limit = unlimited
    // Handle Infinity (comes as null from JSON)
    return data.usage[resource] < limit;
  };

  const hasFeature = (feature: "signatures" | "ai" | "publicProfile"): boolean => {
    if (!data) return true; // Allow if still loading
    return data.features[feature];
  };

  const getUsagePercent = (resource: "clients" | "invoices" | "contracts" | "projects" | "documents"): number => {
    if (!data) return 0;
    const limit = data.limits[resource];
    if (!limit || limit === Infinity) return 0;
    return Math.min(100, Math.round((data.usage[resource] / limit) * 100));
  };

  return {
    data,
    isLoading,
    error,
    plan: data?.plan || "free",
    limits: data?.limits,
    usage: data?.usage,
    features: data?.features,
    canCreate,
    hasFeature,
    getUsagePercent,
  };
}
