-- Row Level Security policies
-- All tables are scoped to the user's organisation via organisation_members lookup.

-- Helper function: get org IDs for the current user
create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
as $$
  select org_id from public.organisation_members where user_id = auth.uid();
$$;

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.projects enable row level security;
alter table public.prospects enable row level security;
alter table public.outreach_emails enable row level security;
alter table public.email_integrations enable row level security;
alter table public.link_exchange_listings enable row level security;
alter table public.link_exchange_matches enable row level security;
alter table public.keyword_alerts enable row level security;
alter table public.audit_log enable row level security;

-- Users: can read/update own row
create policy "users_select_own" on public.users
  for select using (id = auth.uid());
create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- Organisations: can read orgs you belong to
create policy "orgs_select" on public.organisations
  for select using (id in (select public.user_org_ids()));

-- Organisation members: can read members in your org
create policy "org_members_select" on public.organisation_members
  for select using (org_id in (select public.user_org_ids()));

-- Projects: full CRUD within your org
create policy "projects_select" on public.projects
  for select using (org_id in (select public.user_org_ids()));
create policy "projects_insert" on public.projects
  for insert with check (org_id in (select public.user_org_ids()));
create policy "projects_update" on public.projects
  for update using (org_id in (select public.user_org_ids()));
create policy "projects_delete" on public.projects
  for delete using (org_id in (select public.user_org_ids()));

-- Prospects: full CRUD within your org
create policy "prospects_select" on public.prospects
  for select using (org_id in (select public.user_org_ids()));
create policy "prospects_insert" on public.prospects
  for insert with check (org_id in (select public.user_org_ids()));
create policy "prospects_update" on public.prospects
  for update using (org_id in (select public.user_org_ids()));
create policy "prospects_delete" on public.prospects
  for delete using (org_id in (select public.user_org_ids()));

-- Outreach emails: full CRUD within your org
create policy "outreach_emails_select" on public.outreach_emails
  for select using (org_id in (select public.user_org_ids()));
create policy "outreach_emails_insert" on public.outreach_emails
  for insert with check (org_id in (select public.user_org_ids()));
create policy "outreach_emails_update" on public.outreach_emails
  for update using (org_id in (select public.user_org_ids()));

-- Email integrations: read/write within your org
create policy "email_integrations_select" on public.email_integrations
  for select using (org_id in (select public.user_org_ids()));
create policy "email_integrations_insert" on public.email_integrations
  for insert with check (org_id in (select public.user_org_ids()));
create policy "email_integrations_update" on public.email_integrations
  for update using (org_id in (select public.user_org_ids()));

-- Link exchange listings: read all active, write own org
create policy "link_exchange_listings_select" on public.link_exchange_listings
  for select using (is_active = true or org_id in (select public.user_org_ids()));
create policy "link_exchange_listings_insert" on public.link_exchange_listings
  for insert with check (org_id in (select public.user_org_ids()));
create policy "link_exchange_listings_update" on public.link_exchange_listings
  for update using (org_id in (select public.user_org_ids()));

-- Link exchange matches: read if either listing belongs to your org
create policy "link_exchange_matches_select" on public.link_exchange_matches
  for select using (
    listing_a_id in (select id from public.link_exchange_listings where org_id in (select public.user_org_ids()))
    or listing_b_id in (select id from public.link_exchange_listings where org_id in (select public.user_org_ids()))
  );

-- Keyword alerts: scoped to org
create policy "keyword_alerts_select" on public.keyword_alerts
  for select using (org_id in (select public.user_org_ids()));
create policy "keyword_alerts_insert" on public.keyword_alerts
  for insert with check (org_id in (select public.user_org_ids()));
create policy "keyword_alerts_update" on public.keyword_alerts
  for update using (org_id in (select public.user_org_ids()));
create policy "keyword_alerts_delete" on public.keyword_alerts
  for delete using (org_id in (select public.user_org_ids()));

-- Audit log: read-only within your org
create policy "audit_log_select" on public.audit_log
  for select using (org_id in (select public.user_org_ids()));
