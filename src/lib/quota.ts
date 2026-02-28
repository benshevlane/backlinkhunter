import type { OrganisationRecord, PlanTier } from '@/src/lib/types';

export const PLAN_LIMITS: Record<PlanTier, { monthly_prospect_limit: number; price_cents: number }> = {
  starter: { monthly_prospect_limit: 200, price_cents: 0 },
  growth: { monthly_prospect_limit: 1000, price_cents: 4900 },
  agency: { monthly_prospect_limit: 5000, price_cents: 14900 },
};

export interface QuotaCheck {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  plan: PlanTier;
}

/**
 * Check whether an org can add more prospects this month.
 */
export function checkProspectQuota(org: OrganisationRecord, requested: number = 1): QuotaCheck {
  const limit = org.monthly_prospect_limit;
  const used = org.prospects_used_this_month;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: remaining >= requested,
    remaining,
    used,
    limit,
    plan: org.plan,
  };
}

/**
 * Map a Stripe price ID to our plan tier.
 * These should match the price IDs configured in Stripe.
 */
export function stripePriceToPlan(priceId: string): PlanTier | null {
  const mapping: Record<string, PlanTier> = {
    [process.env.STRIPE_PRICE_GROWTH ?? 'price_growth']: 'growth',
    [process.env.STRIPE_PRICE_AGENCY ?? 'price_agency']: 'agency',
  };
  return mapping[priceId] ?? null;
}
