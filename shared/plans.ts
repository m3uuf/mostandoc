export type PlanId = "free" | "starter" | "pro";

export interface PlanLimits {
  clients: number;
  invoices: number;
  contracts: number;
  projects: number;
  documents: number;
  signatures: boolean;
  ai: boolean;
  publicProfile: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  nameAr: string;
  priceHalalah: number | null; // null = dynamic (pro)
  limits: PlanLimits;
}

export interface ProPricingTier {
  clients: number;
  halalahPerClient: number;
  totalHalalah: number;
}

export const PRO_PRICING_TIERS: ProPricingTier[] = [
  { clients: 50, halalahPerClient: 200, totalHalalah: 10000 },
  { clients: 100, halalahPerClient: 150, totalHalalah: 15000 },
  { clients: 200, halalahPerClient: 100, totalHalalah: 20000 },
  { clients: 500, halalahPerClient: 70, totalHalalah: 35000 },
  { clients: 1000, halalahPerClient: 50, totalHalalah: 50000 },
];

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    nameAr: "مجاني",
    priceHalalah: 0,
    limits: {
      clients: 5,
      invoices: 10,
      contracts: 5,
      projects: 3,
      documents: 5,
      signatures: false,
      ai: false,
      publicProfile: false,
    },
  },
  starter: {
    id: "starter",
    nameAr: "المبتدئ",
    priceHalalah: 2900,
    limits: {
      clients: 50,
      invoices: 100,
      contracts: 50,
      projects: 20,
      documents: 50,
      signatures: true,
      ai: false,
      publicProfile: true,
    },
  },
  pro: {
    id: "pro",
    nameAr: "الاحترافي",
    priceHalalah: null,
    limits: {
      clients: Infinity,
      invoices: Infinity,
      contracts: Infinity,
      projects: Infinity,
      documents: Infinity,
      signatures: true,
      ai: true,
      publicProfile: true,
    },
  },
};

/**
 * Get the plan limits for a given plan.
 * For pro plans, pass clientCount to set the actual client limit.
 */
export function getPlanLimits(planId: PlanId | string, clientCount?: number): PlanLimits {
  // Map legacy plan names to current plans
  const planMap: Record<string, PlanId> = { premium: "pro", basic: "starter" };
  const resolvedId = (planMap[planId] || planId) as PlanId;
  const plan = PLANS[resolvedId];
  if (!plan) {
    // Fallback to pro limits for unknown plans
    return { ...PLANS.pro.limits };
  }
  planId = resolvedId;

  if (planId === "pro" && clientCount !== undefined) {
    return {
      ...plan.limits,
      clients: clientCount,
    };
  }

  return { ...plan.limits };
}

/**
 * Calculate pro plan price in halalah for a given number of clients.
 * Linearly interpolates between pricing tiers.
 * Clamps to the range [50, 1000].
 */
export function getProPrice(clientCount: number): number {
  const tiers = PRO_PRICING_TIERS;
  const minClients = tiers[0].clients;
  const maxClients = tiers[tiers.length - 1].clients;

  // Clamp to valid range
  const clamped = Math.max(minClients, Math.min(maxClients, clientCount));

  // Exact tier match
  const exactTier = tiers.find((t) => t.clients === clamped);
  if (exactTier) {
    return exactTier.totalHalalah;
  }

  // Find surrounding tiers and interpolate
  for (let i = 0; i < tiers.length - 1; i++) {
    const lower = tiers[i];
    const upper = tiers[i + 1];
    if (clamped > lower.clients && clamped < upper.clients) {
      const ratio =
        (clamped - lower.clients) / (upper.clients - lower.clients);
      const interpolated =
        lower.totalHalalah + ratio * (upper.totalHalalah - lower.totalHalalah);
      return Math.round(interpolated);
    }
  }

  return tiers[tiers.length - 1].totalHalalah;
}

/**
 * Get a list of feature flags for a plan, useful for UI display.
 */
export function getPlanFeatures(planId: PlanId | string): {
  label: string;
  enabled: boolean;
}[] {
  const planMap: Record<string, PlanId> = { premium: "pro", basic: "starter" };
  const resolvedId = (planMap[planId] || planId) as PlanId;
  const limits = PLANS[resolvedId]?.limits;
  if (!limits) {
    return getPlanFeatures("pro");
  }

  return [
    {
      label: limits.clients === Infinity ? "عدد عملاء غير محدود" : `${limits.clients} عملاء`,
      enabled: true,
    },
    {
      label: limits.invoices === Infinity ? "فواتير غير محدودة" : `${limits.invoices} فاتورة`,
      enabled: true,
    },
    {
      label: limits.contracts === Infinity ? "عقود غير محدودة" : `${limits.contracts} عقد`,
      enabled: true,
    },
    {
      label: limits.projects === Infinity ? "مشاريع غير محدودة" : `${limits.projects} مشروع`,
      enabled: true,
    },
    {
      label: limits.documents === Infinity ? "مستندات غير محدودة" : `${limits.documents} مستند`,
      enabled: true,
    },
    {
      label: "التوقيعات الإلكترونية",
      enabled: limits.signatures,
    },
    {
      label: "مساعد الذكاء الاصطناعي",
      enabled: limits.ai,
    },
    {
      label: "الصفحة العامة",
      enabled: limits.publicProfile,
    },
  ];
}
