-- Backlink Hunter initial schema
-- This migration assumes Supabase auth schema exists.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  monthly_prospect_limit integer not null default 200,
  prospects_used_this_month integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  target_url text not null,
  target_keywords text[] not null default '{}',
  niche text,
  created_at timestamptz not null default now()
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,

  prospect_url text not null,
  prospect_domain text not null,
  page_title text,
  page_url text,
  snippet text,

  domain_authority integer,
  page_authority integer,
  spam_score integer,
  referring_domains integer,
  monthly_traffic integer,

  contact_name text,
  contact_email text,
  contact_role text,
  contact_linkedin_url text,
  contact_source text,

  opportunity_type text check (opportunity_type in ('guest_post', 'resource_link', 'broken_link', 'link_exchange', 'mention')),
  linkability_score integer,
  relevance_score integer,

  status text not null default 'identified' check (
    status in (
      'identified',
      'outreach_queued',
      'contacted',
      'followed_up',
      'won',
      'lost',
      'not_relevant',
      'needs_manual_enrichment',
      'verification_error'
    )
  ),

  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  link_live boolean not null default false,
  link_url text,
  link_verified_at timestamptz,
  link_lost_at timestamptz,

  notes text,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_emails (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,

  subject text not null,
  body_html text not null,
  body_text text not null,
  ai_generated boolean not null default true,
  edited_by_user boolean not null default false,

  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  gmail_message_id text,
  outlook_message_id text,

  opened_at timestamptz,
  replied_at timestamptz,
  reply_snippet text,

  is_followup boolean not null default false,
  followup_number integer not null default 0,
  parent_email_id uuid references public.outreach_emails(id),

  created_at timestamptz not null default now()
);

create table if not exists public.email_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('gmail', 'outlook')),
  email_address text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.link_exchange_listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  domain text not null,
  niche text not null,
  da_range text,
  looking_for text,
  offering text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.link_exchange_matches (
  id uuid primary key default gen_random_uuid(),
  listing_a_id uuid not null references public.link_exchange_listings(id) on delete cascade,
  listing_b_id uuid not null references public.link_exchange_listings(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed')),
  initiated_by uuid references public.organisations(id) on delete set null,
  created_at timestamptz not null default now(),
  check (listing_a_id <> listing_b_id)
);

create table if not exists public.keyword_alerts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  keyword text not null,
  last_checked_at timestamptz,
  last_results_count integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_prospects_set_updated_at on public.prospects;
create trigger trg_prospects_set_updated_at
before update on public.prospects
for each row
execute function public.set_updated_at();

create index if not exists idx_projects_org_id on public.projects(org_id);
create index if not exists idx_prospects_org_id on public.prospects(org_id);
create index if not exists idx_prospects_project_id on public.prospects(project_id);
create index if not exists idx_prospects_status on public.prospects(status);
create index if not exists idx_outreach_emails_prospect_id on public.outreach_emails(prospect_id);
create index if not exists idx_outreach_emails_org_id on public.outreach_emails(org_id);
create index if not exists idx_keyword_alerts_org_id on public.keyword_alerts(org_id);
create index if not exists idx_audit_log_org_id on public.audit_log(org_id);
