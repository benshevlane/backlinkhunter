import { createServerSupabase } from '@/src/lib/supabase/server';
import type {
  EmailIntegrationRecord,
  EntryMethod,
  ExistingBacklinkRecord,
  ImportJobEntryMethod,
  ImportJobRecord,
  ImportJobStatus,
  KeywordAlertRecord,
  OrganisationRecord,
  OutreachEmailRecord,
  ProjectRecord,
  ProspectRecord,
  ProspectStatus,
} from '@/src/lib/types';

function supabase() {
  return createServerSupabase();
}

// ---- Projects ----

export async function listProjects(orgId: string): Promise<ProjectRecord[]> {
  const { data, error } = await supabase()
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProjectRecord[];
}

export async function getProjectById(projectId: string, orgId: string): Promise<ProjectRecord | null> {
  const { data, error } = await supabase()
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as ProjectRecord) ?? null;
}

export async function createProject(
  orgId: string,
  input: {
    name: string;
    target_url: string;
    niche?: string;
    target_keywords?: string[];
    description?: string;
    domain_rating?: number;
    target_audience?: string;
  },
): Promise<ProjectRecord> {
  const { data, error } = await supabase()
    .from('projects')
    .insert({
      org_id: orgId,
      name: input.name,
      target_url: input.target_url,
      niche: input.niche ?? null,
      target_keywords: input.target_keywords ?? [],
      description: input.description ?? null,
      domain_rating: input.domain_rating ?? null,
      target_audience: input.target_audience ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRecord;
}

export async function updateProject(
  projectId: string,
  orgId: string,
  patch: {
    name?: string;
    niche?: string | null;
    target_keywords?: string[];
    description?: string | null;
    domain_rating?: number | null;
    target_audience?: string | null;
  },
): Promise<ProjectRecord> {
  const { data, error } = await supabase()
    .from('projects')
    .update(patch)
    .eq('id', projectId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRecord;
}

// ---- Prospects ----

export async function listProspects(orgId: string): Promise<ProspectRecord[]> {
  const { data, error } = await supabase()
    .from('prospects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProspectRecord[];
}

export async function listProspectsForProject(projectId: string, orgId: string): Promise<ProspectRecord[]> {
  const { data, error } = await supabase()
    .from('prospects')
    .select('*')
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProspectRecord[];
}

export async function getProspectById(prospectId: string, orgId: string): Promise<ProspectRecord | null> {
  const { data, error } = await supabase()
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as ProspectRecord) ?? null;
}

export async function createProspect(
  projectId: string,
  orgId: string,
  input: { prospect_url: string; opportunity_type?: ProspectRecord['opportunity_type']; contact_email?: string },
): Promise<ProspectRecord> {
  const domain = new URL(input.prospect_url).hostname.replace(/^www\./, '');

  const { data, error } = await supabase()
    .from('prospects')
    .insert({
      project_id: projectId,
      org_id: orgId,
      prospect_url: input.prospect_url,
      prospect_domain: domain,
      contact_email: input.contact_email ?? null,
      contact_source: input.contact_email ? 'manual' : null,
      opportunity_type: input.opportunity_type ?? 'guest_post',
      status: 'identified',
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProspectRecord;
}

export async function updateProspectStatus(id: string, orgId: string, status: ProspectStatus): Promise<ProspectRecord> {
  const { data, error } = await supabase()
    .from('prospects')
    .update({ status })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as ProspectRecord;
}

export async function updateProspect(
  id: string,
  orgId: string,
  patch: {
    contact_name?: string | null;
    contact_email?: string | null;
    contact_role?: string | null;
    contact_source?: string | null;
    status?: ProspectStatus;
  },
): Promise<ProspectRecord> {
  const { data, error } = await supabase()
    .from('prospects')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as ProspectRecord;
}

// ---- Outreach Emails ----

export async function createOutreachEmail(
  input: {
    prospect_id: string;
    org_id: string;
    project_id: string;
    subject: string;
    body_html: string;
    body_text: string;
    ai_generated: boolean;
    edited_by_user: boolean;
    status?: OutreachEmailRecord['status'];
    is_followup: boolean;
    followup_number: number;
  },
): Promise<OutreachEmailRecord> {
  const { data, error } = await supabase()
    .from('outreach_emails')
    .insert({
      prospect_id: input.prospect_id,
      org_id: input.org_id,
      project_id: input.project_id,
      subject: input.subject,
      body_html: input.body_html,
      body_text: input.body_text,
      ai_generated: input.ai_generated,
      edited_by_user: input.edited_by_user,
      status: input.status ?? 'draft',
      is_followup: input.is_followup,
      followup_number: input.followup_number,
    })
    .select()
    .single();

  if (error) throw error;
  return data as OutreachEmailRecord;
}

export async function listOutreachEmailsForProject(projectId: string, orgId: string): Promise<OutreachEmailRecord[]> {
  const { data, error } = await supabase()
    .from('outreach_emails')
    .select('*')
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as OutreachEmailRecord[];
}

export async function listOutreachEmailsForProspect(prospectId: string, orgId: string): Promise<OutreachEmailRecord[]> {
  const { data, error } = await supabase()
    .from('outreach_emails')
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as OutreachEmailRecord[];
}

// ---- Existing Backlinks ----

export async function listExistingBacklinksForProject(
  projectId: string,
  orgId: string,
): Promise<ExistingBacklinkRecord[]> {
  const { data, error } = await supabase()
    .from('existing_backlinks')
    .select('*')
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ExistingBacklinkRecord[];
}

export async function createExistingBacklink(
  projectId: string,
  orgId: string,
  input: {
    linking_domain: string;
    linking_url?: string;
    dr?: number;
    first_seen?: string;
    last_seen?: string;
  },
): Promise<ExistingBacklinkRecord> {
  const { data, error } = await supabase()
    .from('existing_backlinks')
    .insert({
      project_id: projectId,
      org_id: orgId,
      linking_domain: input.linking_domain,
      linking_url: input.linking_url ?? null,
      dr: input.dr ?? null,
      first_seen: input.first_seen ?? null,
      last_seen: input.last_seen ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ExistingBacklinkRecord;
}

export async function upsertExistingBacklinks(
  projectId: string,
  orgId: string,
  backlinks: {
    linking_domain: string;
    linking_url?: string;
    dr?: number;
    first_seen?: string;
    last_seen?: string;
  }[],
): Promise<ExistingBacklinkRecord[]> {
  if (backlinks.length === 0) return [];

  const rows = backlinks.map((b) => ({
    project_id: projectId,
    org_id: orgId,
    linking_domain: b.linking_domain,
    linking_url: b.linking_url ?? null,
    dr: b.dr ?? null,
    first_seen: b.first_seen ?? null,
    last_seen: b.last_seen ?? null,
  }));

  const { data, error } = await supabase()
    .from('existing_backlinks')
    .upsert(rows, { onConflict: 'project_id,linking_domain', ignoreDuplicates: false })
    .select();

  if (error) throw error;
  return (data ?? []) as ExistingBacklinkRecord[];
}

export async function checkDomainIsExistingBacklink(
  projectId: string,
  orgId: string,
  domain: string,
): Promise<boolean> {
  const { count, error } = await supabase()
    .from('existing_backlinks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .eq('linking_domain', domain);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ---- Prospect Dedup ----

export async function checkDomainIsExistingProspect(
  projectId: string,
  orgId: string,
  domain: string,
): Promise<boolean> {
  const { count, error } = await supabase()
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .eq('prospect_domain', domain);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ---- Bulk Prospect Creation ----

export async function createProspectsBulk(
  projectId: string,
  orgId: string,
  prospects: {
    prospect_url: string;
    prospect_domain: string;
    page_title?: string;
    page_url?: string;
    snippet?: string;
    opportunity_type?: ProspectRecord['opportunity_type'];
    domain_authority?: number;
    spam_score?: number;
    linkability_score?: number;
    relevance_score?: number;
    entry_method: EntryMethod;
  }[],
): Promise<ProspectRecord[]> {
  if (prospects.length === 0) return [];

  const rows = prospects.map((p) => ({
    project_id: projectId,
    org_id: orgId,
    prospect_url: p.prospect_url,
    prospect_domain: p.prospect_domain,
    page_title: p.page_title ?? null,
    page_url: p.page_url ?? null,
    snippet: p.snippet ?? null,
    opportunity_type: p.opportunity_type ?? null,
    domain_authority: p.domain_authority ?? null,
    spam_score: p.spam_score ?? null,
    linkability_score: p.linkability_score ?? null,
    relevance_score: p.relevance_score ?? null,
    entry_method: p.entry_method,
    status: 'identified' as const,
  }));

  const { data, error } = await supabase()
    .from('prospects')
    .insert(rows)
    .select();

  if (error) throw error;
  return (data ?? []) as ProspectRecord[];
}

// ---- Import Jobs ----

export async function createImportJob(
  projectId: string,
  orgId: string,
  input: {
    entry_method: ImportJobEntryMethod;
    total_submitted: number;
    input_payload?: Record<string, unknown>;
  },
): Promise<ImportJobRecord> {
  const { data, error } = await supabase()
    .from('import_jobs')
    .insert({
      project_id: projectId,
      org_id: orgId,
      entry_method: input.entry_method,
      total_submitted: input.total_submitted,
      input_payload: input.input_payload ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as ImportJobRecord;
}

export async function getImportJobById(jobId: string, orgId: string): Promise<ImportJobRecord | null> {
  const { data, error } = await supabase()
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as ImportJobRecord) ?? null;
}

export async function updateImportJob(
  jobId: string,
  orgId: string,
  patch: {
    status?: ImportJobStatus;
    total_passed?: number;
    total_review?: number;
    total_failed?: number;
    results_payload?: Record<string, unknown>;
    completed_at?: string;
  },
): Promise<ImportJobRecord> {
  const { data, error } = await supabase()
    .from('import_jobs')
    .update(patch)
    .eq('id', jobId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as ImportJobRecord;
}

export async function listImportJobsForProject(
  projectId: string,
  orgId: string,
): Promise<ImportJobRecord[]> {
  const { data, error } = await supabase()
    .from('import_jobs')
    .select('*')
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ImportJobRecord[];
}

// ---- Keyword Alerts ----

export async function listKeywordAlertsForProject(
  projectId: string,
  orgId: string,
): Promise<KeywordAlertRecord[]> {
  const { data, error } = await supabase()
    .from('keyword_alerts')
    .select('*')
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as KeywordAlertRecord[];
}

export async function createKeywordAlert(
  projectId: string,
  orgId: string,
  keyword: string,
): Promise<KeywordAlertRecord> {
  const { data, error } = await supabase()
    .from('keyword_alerts')
    .insert({ project_id: projectId, org_id: orgId, keyword })
    .select()
    .single();

  if (error) throw error;
  return data as KeywordAlertRecord;
}

export async function updateKeywordAlert(
  alertId: string,
  orgId: string,
  patch: {
    last_checked_at?: string;
    last_results_count?: number;
    is_active?: boolean;
  },
): Promise<KeywordAlertRecord> {
  const { data, error } = await supabase()
    .from('keyword_alerts')
    .update(patch)
    .eq('id', alertId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as KeywordAlertRecord;
}

export async function listActiveKeywordAlerts(orgId: string): Promise<KeywordAlertRecord[]> {
  const { data, error } = await supabase()
    .from('keyword_alerts')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data ?? []) as KeywordAlertRecord[];
}

// ---- Link Verification ----

export async function updateProspectLinkStatus(
  id: string,
  orgId: string,
  patch: {
    link_live: boolean;
    link_url?: string | null;
    link_verified_at?: string;
    link_lost_at?: string | null;
    status?: ProspectStatus;
  },
): Promise<ProspectRecord> {
  const { data, error } = await supabase()
    .from('prospects')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as ProspectRecord;
}

export async function listWonProspectsForProject(
  projectId: string,
  orgId: string,
): Promise<ProspectRecord[]> {
  const { data, error } = await supabase()
    .from('prospects')
    .select('*')
    .eq('project_id', projectId)
    .eq('org_id', orgId)
    .eq('status', 'won')
    .order('link_verified_at', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data ?? []) as ProspectRecord[];
}

// ---- Agent Messages ----

export interface AgentMessageRecord {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls: unknown | null;
  tool_results: unknown | null;
  created_at: string;
}

export async function listAgentMessages(
  projectId: string,
  userId: string,
): Promise<AgentMessageRecord[]> {
  const { data, error } = await supabase()
    .from('agent_messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AgentMessageRecord[];
}

export async function createAgentMessage(
  input: {
    project_id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    tool_calls?: unknown;
    tool_results?: unknown;
  },
): Promise<AgentMessageRecord> {
  const { data, error } = await supabase()
    .from('agent_messages')
    .insert({
      project_id: input.project_id,
      user_id: input.user_id,
      role: input.role,
      content: input.content,
      tool_calls: input.tool_calls ?? null,
      tool_results: input.tool_results ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AgentMessageRecord;
}

// ---- Email Integrations ----

export async function getActiveEmailIntegration(
  orgId: string,
  userId: string,
): Promise<EmailIntegrationRecord | null> {
  const { data, error } = await supabase()
    .from('email_integrations')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as EmailIntegrationRecord) ?? null;
}

export async function upsertEmailIntegration(
  input: {
    org_id: string;
    user_id: string;
    provider: 'gmail' | 'outlook';
    email_address: string;
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
    is_active: boolean;
  },
): Promise<EmailIntegrationRecord> {
  // Deactivate existing integrations for this user first
  await supabase()
    .from('email_integrations')
    .update({ is_active: false })
    .eq('org_id', input.org_id)
    .eq('user_id', input.user_id)
    .eq('provider', input.provider);

  const { data, error } = await supabase()
    .from('email_integrations')
    .insert({
      org_id: input.org_id,
      user_id: input.user_id,
      provider: input.provider,
      email_address: input.email_address,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      token_expires_at: input.token_expires_at,
      is_active: input.is_active,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EmailIntegrationRecord;
}

export async function updateEmailIntegration(
  id: string,
  orgId: string,
  patch: {
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    is_active?: boolean;
  },
): Promise<EmailIntegrationRecord> {
  const { data, error } = await supabase()
    .from('email_integrations')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as EmailIntegrationRecord;
}

export async function getOutreachEmailById(
  emailId: string,
  orgId: string,
): Promise<OutreachEmailRecord | null> {
  const { data, error } = await supabase()
    .from('outreach_emails')
    .select('*')
    .eq('id', emailId)
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as OutreachEmailRecord) ?? null;
}

export async function updateOutreachEmail(
  id: string,
  orgId: string,
  patch: {
    status?: OutreachEmailRecord['status'];
    sent_at?: string;
    gmail_message_id?: string;
    replied_at?: string;
    reply_snippet?: string;
  },
): Promise<OutreachEmailRecord> {
  const { data, error } = await supabase()
    .from('outreach_emails')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as OutreachEmailRecord;
}

// ---- Organisation / Quota ----

export async function getOrganisation(orgId: string): Promise<OrganisationRecord | null> {
  const { data, error } = await supabase()
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as OrganisationRecord) ?? null;
}

export async function incrementProspectsUsed(orgId: string, count: number): Promise<void> {
  const { error } = await supabase().rpc('increment_prospects_used', {
    p_org_id: orgId,
    p_count: count,
  });

  // If the RPC doesn't exist yet, fall back to a manual update
  if (error) {
    const org = await getOrganisation(orgId);
    if (!org) throw new Error('Organisation not found');
    const { error: updateError } = await supabase()
      .from('organisations')
      .update({ prospects_used_this_month: org.prospects_used_this_month + count })
      .eq('id', orgId);
    if (updateError) throw updateError;
  }
}

export async function updateOrganisationPlan(
  orgId: string,
  patch: {
    plan?: OrganisationRecord['plan'];
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    monthly_prospect_limit?: number;
    prospects_used_this_month?: number;
  },
): Promise<OrganisationRecord> {
  const { data, error } = await supabase()
    .from('organisations')
    .update(patch)
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data as OrganisationRecord;
}
