-- v2 schema additions: existing_backlinks, import_jobs, project + prospect column additions
-- Supports the 6-step flow: site analysis, backlink profile, discovery, import, scoring, enrichment

-- ============================================================
-- New table: existing_backlinks (Step 2 — backlink profile)
-- ============================================================

create table if not exists public.existing_backlinks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  linking_domain text not null,
  linking_url text,
  dr integer,
  first_seen timestamptz,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  unique(project_id, linking_domain)
);

create index if not exists idx_existing_backlinks_project on public.existing_backlinks(project_id);

-- ============================================================
-- New table: import_jobs (Step 3 — discovery runs + CSV imports)
-- ============================================================

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  entry_method text not null check (entry_method in ('discovery', 'import')),
  total_submitted integer not null default 0,
  total_passed integer not null default 0,
  total_review integer not null default 0,
  total_failed integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  input_payload jsonb,
  results_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_import_jobs_project on public.import_jobs(project_id);

-- ============================================================
-- Alter projects: add site analysis fields
-- ============================================================

alter table public.projects
  add column if not exists description text,
  add column if not exists domain_rating integer,
  add column if not exists target_audience text;

-- ============================================================
-- Alter prospects: add entry_method + new statuses
-- ============================================================

alter table public.prospects
  add column if not exists entry_method text check (entry_method in ('discovery', 'import', 'manual'));

-- Expand status check to include enriched + outreach_drafted
alter table public.prospects drop constraint if exists prospects_status_check;
alter table public.prospects add constraint prospects_status_check check (
  status in (
    'identified',
    'enriched',
    'outreach_drafted',
    'outreach_queued',
    'contacted',
    'followed_up',
    'won',
    'lost',
    'not_relevant',
    'needs_manual_enrichment',
    'verification_error'
  )
);

-- Composite index for Kanban queries (replaces individual status index)
drop index if exists idx_prospects_status;
create index if not exists idx_prospects_project_status on public.prospects(project_id, status);

-- Domain dedup index
create index if not exists idx_prospects_domain on public.prospects(project_id, prospect_domain);

-- ============================================================
-- RLS policies for new tables
-- ============================================================

alter table public.existing_backlinks enable row level security;
alter table public.import_jobs enable row level security;

create policy "org members can view existing_backlinks"
  on public.existing_backlinks for select
  using (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));

create policy "org members can insert existing_backlinks"
  on public.existing_backlinks for insert
  with check (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));

create policy "org members can update existing_backlinks"
  on public.existing_backlinks for update
  using (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));

create policy "org members can delete existing_backlinks"
  on public.existing_backlinks for delete
  using (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));

create policy "org members can view import_jobs"
  on public.import_jobs for select
  using (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));

create policy "org members can insert import_jobs"
  on public.import_jobs for insert
  with check (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));

create policy "org members can update import_jobs"
  on public.import_jobs for update
  using (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));
