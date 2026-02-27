export type PlanTier = 'starter' | 'growth' | 'agency';

export type OrgRole = 'owner' | 'admin' | 'member';

export type OpportunityType =
  | 'guest_post'
  | 'resource_link'
  | 'broken_link'
  | 'link_exchange'
  | 'mention';

export type ProspectStatus =
  | 'identified'
  | 'outreach_queued'
  | 'contacted'
  | 'followed_up'
  | 'won'
  | 'lost'
  | 'not_relevant'
  | 'needs_manual_enrichment'
  | 'verification_error';

export type OutreachEmailStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

export type EmailProvider = 'gmail' | 'outlook';

export interface ProjectRecord {
  id: string;
  org_id: string;
  name: string;
  target_url: string;
  target_keywords: string[];
  niche: string | null;
  created_at: string;
}


export interface DiscoverRequest {
  project_id: string;
  seed_url?: string;
  seed_keywords?: string[];
  opportunity_types: Exclude<OpportunityType, 'mention'>[];
  filters: {
    min_da?: number;
    max_spam_score?: number;
    exclude_domains?: string[];
    country?: string;
  };
  limit?: number;
}

export interface DiscoverOpportunity {
  prospect_url: string;
  prospect_domain: string;
  page_title: string;
  page_url: string;
  snippet: string;
  opportunity_type: OpportunityType;
  linkability_score: number;
  relevance_score: number;
}

export interface DiscoverResponse {
  opportunities: DiscoverOpportunity[];
}

export interface EnrichProspectRequest {
  prospect_id: string;
}

export interface EnrichProspectResponse {
  prospect: ProspectRecord;
  enrichment: {
    contact_name: string | null;
    contact_email: string | null;
    contact_role: string | null;
    contact_source: string;
  };
}


export interface OutreachGenerateRequest {
  prospect_id: string;
  tone: 'professional' | 'friendly' | 'concise';
  custom_value_prop?: string;
  is_followup: boolean;
  followup_number?: 1 | 2;
}

export interface OutreachGenerateResponse {
  email_id: string;
  subject: string;
  body_html: string;
  body_text: string;
}

export interface ProspectRecord {
  id: string;
  project_id: string;
  org_id: string;
  prospect_url: string;
  prospect_domain: string;
  page_title: string | null;
  page_url: string | null;
  snippet: string | null;
  domain_authority: number | null;
  page_authority: number | null;
  spam_score: number | null;
  referring_domains: number | null;
  monthly_traffic: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_linkedin_url: string | null;
  contact_source: string | null;
  opportunity_type: OpportunityType | null;
  linkability_score: number | null;
  relevance_score: number | null;
  status: ProspectStatus;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  link_live: boolean;
  link_url: string | null;
  link_verified_at: string | null;
  link_lost_at: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface OutreachEmailRecord {
  id: string;
  prospect_id: string;
  org_id: string;
  project_id: string;
  subject: string;
  body_html: string;
  body_text: string;
  ai_generated: boolean;
  edited_by_user: boolean;
  status: OutreachEmailStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  gmail_message_id: string | null;
  outlook_message_id: string | null;
  opened_at: string | null;
  replied_at: string | null;
  reply_snippet: string | null;
  is_followup: boolean;
  followup_number: number;
  parent_email_id: string | null;
  created_at: string;
}

// ---- DB entity types matching the schema ----

export interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface OrganisationRecord {
  id: string;
  name: string;
  plan: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_prospect_limit: number;
  prospects_used_this_month: number;
  created_at: string;
}

export interface OrganisationMemberRecord {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface EmailIntegrationRecord {
  id: string;
  org_id: string;
  user_id: string;
  provider: EmailProvider;
  email_address: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LinkExchangeListingRecord {
  id: string;
  org_id: string;
  project_id: string;
  domain: string;
  niche: string;
  da_range: string | null;
  looking_for: string | null;
  offering: string | null;
  is_active: boolean;
  created_at: string;
}

export type LinkExchangeMatchStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface LinkExchangeMatchRecord {
  id: string;
  listing_a_id: string;
  listing_b_id: string;
  status: LinkExchangeMatchStatus;
  initiated_by: string | null;
  created_at: string;
}

export interface KeywordAlertRecord {
  id: string;
  project_id: string;
  org_id: string;
  keyword: string;
  last_checked_at: string | null;
  last_results_count: number | null;
  is_active: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
