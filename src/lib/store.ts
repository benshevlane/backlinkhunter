import { createServerSupabase } from '@/src/lib/supabase/server';
import type { OutreachEmailRecord, ProjectRecord, ProspectRecord, ProspectStatus } from '@/src/lib/types';

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
  input: { name: string; target_url: string; niche?: string; target_keywords?: string[] },
): Promise<ProjectRecord> {
  const { data, error } = await supabase()
    .from('projects')
    .insert({
      org_id: orgId,
      name: input.name,
      target_url: input.target_url,
      niche: input.niche ?? null,
      target_keywords: input.target_keywords ?? [],
    })
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
