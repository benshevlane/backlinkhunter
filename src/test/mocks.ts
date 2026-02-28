import { vi } from 'vitest';
import type { ProspectRecord, ProjectRecord, ExistingBacklinkRecord, OutreachEmailRecord, KeywordAlertRecord, OrganisationRecord } from '@/src/lib/types';

// ---- Factory helpers to create test records ----

let counter = 0;
function uuid() {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`;
}

export function resetCounter() {
  counter = 0;
}

export function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: uuid(),
    org_id: uuid(),
    name: 'Test Project',
    target_url: 'https://example.com',
    niche: 'tech',
    target_keywords: ['seo', 'backlinks'],
    description: 'A test project',
    domain_rating: 45,
    target_audience: 'marketers',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeProspect(overrides: Partial<ProspectRecord> = {}): ProspectRecord {
  return {
    id: uuid(),
    project_id: uuid(),
    org_id: uuid(),
    prospect_url: 'https://prospect.com/page',
    prospect_domain: 'prospect.com',
    page_title: 'Test Page',
    page_url: 'https://prospect.com/page',
    snippet: 'A test snippet',
    opportunity_type: 'guest_post',
    status: 'identified',
    contact_name: null,
    contact_email: null,
    contact_role: null,
    contact_linkedin_url: null,
    contact_source: null,
    domain_authority: 30,
    page_authority: null,
    spam_score: 5,
    referring_domains: null,
    monthly_traffic: null,
    linkability_score: 70,
    relevance_score: 80,
    entry_method: 'discovery',
    first_contacted_at: null,
    last_contacted_at: null,
    link_live: false,
    link_url: null,
    link_verified_at: null,
    link_lost_at: null,
    notes: null,
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeOutreachEmail(overrides: Partial<OutreachEmailRecord> = {}): OutreachEmailRecord {
  return {
    id: uuid(),
    prospect_id: uuid(),
    org_id: uuid(),
    project_id: uuid(),
    subject: 'Test Subject',
    body_html: '<p>Hello</p>',
    body_text: 'Hello',
    ai_generated: true,
    edited_by_user: false,
    status: 'draft',
    scheduled_for: null,
    sent_at: null,
    gmail_message_id: null,
    outlook_message_id: null,
    opened_at: null,
    replied_at: null,
    reply_snippet: null,
    is_followup: false,
    followup_number: 0,
    parent_email_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeBacklink(overrides: Partial<ExistingBacklinkRecord> = {}): ExistingBacklinkRecord {
  return {
    id: uuid(),
    project_id: uuid(),
    org_id: uuid(),
    linking_domain: 'backlink.com',
    linking_url: 'https://backlink.com/page',
    dr: 40,
    first_seen: null,
    last_seen: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeKeywordAlert(overrides: Partial<KeywordAlertRecord> = {}): KeywordAlertRecord {
  return {
    id: uuid(),
    project_id: uuid(),
    org_id: uuid(),
    keyword: 'test keyword',
    last_checked_at: null,
    last_results_count: null,
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeOrganisation(overrides: Partial<OrganisationRecord> = {}): OrganisationRecord {
  return {
    id: uuid(),
    name: 'Test Org',
    plan: 'starter',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    monthly_prospect_limit: 200,
    prospects_used_this_month: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---- Supabase mock builder ----

export function mockSupabaseClient() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const from = vi.fn().mockReturnValue(chainable);

  return {
    from,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _chain: chainable,
  };
}
