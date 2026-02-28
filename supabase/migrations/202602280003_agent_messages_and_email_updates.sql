-- Agent messages table for conversation persistence
-- and email_integrations updates for reply checking

-- ============================================================
-- New table: agent_messages (conversation persistence)
-- ============================================================

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_messages_project_created
  on public.agent_messages(project_id, created_at);

-- ============================================================
-- Alter email_integrations: add last_reply_checked_at
-- ============================================================

alter table public.email_integrations
  add column if not exists last_reply_checked_at timestamptz;

-- ============================================================
-- RLS policies for agent_messages
-- ============================================================

alter table public.agent_messages enable row level security;

create policy "users can view own agent_messages"
  on public.agent_messages for select
  using (user_id = auth.uid());

create policy "users can insert own agent_messages"
  on public.agent_messages for insert
  with check (user_id = auth.uid());

-- ============================================================
-- Enable realtime on prospects table for Kanban live updates
-- ============================================================

alter publication supabase_realtime add table public.prospects;
