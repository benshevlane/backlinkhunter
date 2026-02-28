-- Schema fixes: missing indexes, updated_at on outreach_emails, uniqueness on email_integrations
-- Addresses review items S3-S12, S7, S8

-- ============================================================
-- S4: Index on email_integrations for send-flow lookup
-- ============================================================
create index if not exists idx_email_integrations_org_user
  on public.email_integrations(org_id, user_id);

-- ============================================================
-- S5: Index on link_exchange_listings for niche-based matching
-- ============================================================
create index if not exists idx_link_exchange_listings_niche
  on public.link_exchange_listings(niche);

-- ============================================================
-- S6: Indexes on link_exchange_matches FK columns
-- ============================================================
create index if not exists idx_link_exchange_matches_listing_a
  on public.link_exchange_matches(listing_a_id);
create index if not exists idx_link_exchange_matches_listing_b
  on public.link_exchange_matches(listing_b_id);

-- ============================================================
-- S11: Index on link_exchange_listings(org_id) for listing management page
-- ============================================================
create index if not exists idx_link_exchange_listings_org_id
  on public.link_exchange_listings(org_id);

-- ============================================================
-- S12: Index on audit_log for time-range queries
-- ============================================================
create index if not exists idx_audit_log_org_created
  on public.audit_log(org_id, created_at desc);

-- ============================================================
-- S7: Add updated_at column + trigger on outreach_emails
-- ============================================================
alter table public.outreach_emails
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_outreach_emails_set_updated_at on public.outreach_emails;
create trigger trg_outreach_emails_set_updated_at
  before update on public.outreach_emails
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- S8: Uniqueness constraint on email_integrations per email address per org
-- Prevents connecting the same email account twice within an org.
-- ============================================================
alter table public.email_integrations
  add constraint email_integrations_org_email_unique unique (org_id, email_address);

-- ============================================================
-- S10: Index on prospect_domain for dedup queries (standalone)
-- The v2 migration added (project_id, prospect_domain) but a standalone
-- index helps cross-project dedup.
-- ============================================================
create index if not exists idx_prospects_prospect_domain
  on public.prospects(prospect_domain);
