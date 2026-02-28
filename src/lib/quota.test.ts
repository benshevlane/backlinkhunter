import { describe, it, expect } from 'vitest';
import { checkProspectQuota, PLAN_LIMITS } from './quota';
import { makeOrganisation } from '@/src/test/mocks';

describe('checkProspectQuota', () => {
  it('allows when under limit', () => {
    const org = makeOrganisation({ prospects_used_this_month: 50, monthly_prospect_limit: 200 });
    const result = checkProspectQuota(org);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(150);
  });

  it('allows when exactly at capacity for requested count', () => {
    const org = makeOrganisation({ prospects_used_this_month: 195, monthly_prospect_limit: 200 });
    const result = checkProspectQuota(org, 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('denies when over limit', () => {
    const org = makeOrganisation({ prospects_used_this_month: 200, monthly_prospect_limit: 200 });
    const result = checkProspectQuota(org);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('denies when requested count exceeds remaining', () => {
    const org = makeOrganisation({ prospects_used_this_month: 195, monthly_prospect_limit: 200 });
    const result = checkProspectQuota(org, 10);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(5);
  });

  it('returns correct plan tier', () => {
    const org = makeOrganisation({ plan: 'agency' });
    const result = checkProspectQuota(org);
    expect(result.plan).toBe('agency');
  });
});

describe('PLAN_LIMITS', () => {
  it('has correct limits for each tier', () => {
    expect(PLAN_LIMITS.starter.monthly_prospect_limit).toBe(200);
    expect(PLAN_LIMITS.growth.monthly_prospect_limit).toBe(1000);
    expect(PLAN_LIMITS.agency.monthly_prospect_limit).toBe(5000);
  });

  it('starter is free', () => {
    expect(PLAN_LIMITS.starter.price_cents).toBe(0);
  });
});
