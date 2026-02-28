import { analyseSite } from '@/src/lib/site-analysis';
import { discoverOpportunities } from '@/src/lib/discovery';
import { enrichProspectContact } from '@/src/lib/enrichment';
import { generateOutreachDraft } from '@/src/lib/outreach';
import { verifyProspectLink } from '@/src/lib/link-verification';
import { validateImportUrls } from '@/src/lib/import-validation';
import {
  getProjectById,
  getProspectById,
  listProspectsForProject,
  listExistingBacklinksForProject,
  createImportJob,
  updateImportJob,
  createProspectsBulk,
  updateProspect,
  updateProspectStatus,
  updateProspectLinkStatus,
  createOutreachEmail,
  listOutreachEmailsForProspect,
  getOrganisation,
  incrementProspectsUsed,
} from '@/src/lib/store';
import { checkProspectQuota } from '@/src/lib/quota';
import type { DiscoverRequest, ProspectStatus, OutreachTone } from '@/src/lib/types';
import { logger } from '@/src/lib/logger';

const log = logger.create('agent-executor');

export async function executeAgentTool(
  toolName: string,
  input: Record<string, unknown>,
  projectId: string,
  orgId: string,
): Promise<unknown> {
  log.info('Executing agent tool', { toolName, projectId });

  switch (toolName) {
    case 'analyse_site':
      return handleAnalyseSite(input.project_id as string, orgId);

    case 'check_existing_backlinks':
      return handleCheckExistingBacklinks(input.project_id as string, orgId);

    case 'run_discovery':
      return handleRunDiscovery(input, orgId);

    case 'import_prospects':
      return handleImportProspects(input, orgId);

    case 'validate_import':
      return handleValidateImport(input, orgId);

    case 'confirm_import':
      return handleConfirmImport(input, orgId);

    case 'enrich_contacts':
      return handleEnrichContacts(input.prospect_ids as string[], orgId);

    case 'generate_outreach_email':
      return handleGenerateOutreachEmail(input, orgId);

    case 'generate_bulk_emails':
      return handleGenerateBulkEmails(input, orgId);

    case 'get_pipeline_summary':
      return handleGetPipelineSummary(input.project_id as string, orgId);

    case 'get_prospects_needing_attention':
      return handleGetProspectsNeedingAttention(input.project_id as string, orgId);

    case 'update_prospect_status':
      return handleUpdateProspectStatus(input, orgId);

    case 'check_link_live':
      return handleCheckLinkLive(input.prospect_id as string, orgId);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function handleAnalyseSite(projectId: string, orgId: string) {
  const project = await getProjectById(projectId, orgId);
  if (!project) return { error: 'Project not found' };

  const analysis = await analyseSite(project.target_url);
  return { project_id: projectId, analysis };
}

async function handleCheckExistingBacklinks(projectId: string, orgId: string) {
  const backlinks = await listExistingBacklinksForProject(projectId, orgId);
  return {
    project_id: projectId,
    count: backlinks.length,
    domains: backlinks.map((b) => ({
      domain: b.linking_domain,
      url: b.linking_url,
      dr: b.dr,
    })),
  };
}

async function handleRunDiscovery(input: Record<string, unknown>, orgId: string) {
  const projectId = input.project_id as string;
  const project = await getProjectById(projectId, orgId);
  if (!project) return { error: 'Project not found' };

  // Map agent tool types to internal types
  const typeMapping: Record<string, string> = {
    resource_page: 'resource_link',
    guest_post: 'guest_post',
    directory_listing: 'link_exchange',
    competitor_mention: 'mention',
    broken_link: 'broken_link',
  };

  const rawTypes = (input.opportunity_types as string[] | undefined) ?? ['resource_link', 'guest_post'];
  const mappedTypes = rawTypes.map((t) => typeMapping[t] ?? t) as DiscoverRequest['opportunity_types'];

  const payload: DiscoverRequest = {
    project_id: projectId,
    seed_keywords: input.keywords as string[] | undefined,
    seed_url: input.competitor_url as string | undefined,
    opportunity_types: mappedTypes.length > 0 ? mappedTypes : ['resource_link', 'guest_post'],
    filters: {},
    limit: (input.limit as number) ?? 30,
  };

  const opportunities = await discoverOpportunities(payload, orgId, project.target_keywords);

  // Create an import job to track this discovery run
  const job = await createImportJob(projectId, orgId, {
    entry_method: 'discovery',
    total_submitted: opportunities.length,
    input_payload: { keywords: input.keywords, competitor_url: input.competitor_url },
  });

  await updateImportJob(job.id, orgId, {
    status: 'complete',
    total_passed: opportunities.length,
    results_payload: { opportunities } as Record<string, unknown>,
    completed_at: new Date().toISOString(),
  });

  return {
    job_id: job.id,
    total: opportunities.length,
    opportunities: opportunities.map((o) => ({
      url: o.prospect_url,
      domain: o.prospect_domain,
      title: o.page_title,
      type: o.opportunity_type,
      linkability_score: o.linkability_score,
      relevance_score: o.relevance_score,
    })),
  };
}

async function handleImportProspects(input: Record<string, unknown>, orgId: string) {
  const projectId = input.project_id as string;
  const jobId = input.job_id as string;
  const selectedIds = input.selected_prospect_ids as string[];

  const project = await getProjectById(projectId, orgId);
  if (!project) return { error: 'Project not found' };

  // Check quota
  const org = await getOrganisation(orgId);
  if (org) {
    const quota = checkProspectQuota(org, selectedIds.length);
    if (!quota.allowed) {
      return { error: `Quota exceeded: ${quota.remaining} prospects remaining` };
    }
  }

  // The selectedIds are actually URLs from the discovery results
  const prospects = selectedIds.map((url) => {
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domain = url;
    }
    return {
      prospect_url: url,
      prospect_domain: domain,
      entry_method: 'discovery' as const,
    };
  });

  const created = await createProspectsBulk(projectId, orgId, prospects);

  if (org && created.length > 0) {
    await incrementProspectsUsed(orgId, created.length);
  }

  if (jobId) {
    await updateImportJob(jobId, orgId, {
      status: 'complete',
      total_passed: created.length,
      completed_at: new Date().toISOString(),
    });
  }

  return {
    imported: created.length,
    prospect_ids: created.map((p) => p.id),
  };
}

async function handleValidateImport(input: Record<string, unknown>, orgId: string) {
  const projectId = input.project_id as string;
  const urls = input.urls as string[];

  const results = await validateImportUrls(urls, projectId, orgId, {
    min_da: 10,
    min_relevance: 30,
    max_spam_score: 30,
  });

  return {
    total: results.length,
    passed: results.filter((r) => r.bucket === 'pass').length,
    review: results.filter((r) => r.bucket === 'review').length,
    failed: results.filter((r) => r.bucket === 'fail').length,
    results: results.map((r) => ({
      url: r.url,
      domain: r.domain,
      bucket: r.bucket,
      reason: r.reason,
      da: r.domain_authority,
      spam_score: r.spam_score,
    })),
  };
}

async function handleConfirmImport(input: Record<string, unknown>, orgId: string) {
  const projectId = input.project_id as string;
  const urls = input.urls as string[];

  const org = await getOrganisation(orgId);
  if (org) {
    const quota = checkProspectQuota(org, urls.length);
    if (!quota.allowed) {
      return { error: `Quota exceeded: ${quota.remaining} prospects remaining` };
    }
  }

  const prospects = urls.map((url) => {
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domain = url;
    }
    return {
      prospect_url: url,
      prospect_domain: domain,
      entry_method: 'import' as const,
    };
  });

  const created = await createProspectsBulk(projectId, orgId, prospects);

  if (org && created.length > 0) {
    await incrementProspectsUsed(orgId, created.length);
  }

  return {
    imported: created.length,
    prospect_ids: created.map((p) => p.id),
  };
}

async function handleEnrichContacts(prospectIds: string[], orgId: string) {
  const results = [];

  for (const id of prospectIds) {
    const prospect = await getProspectById(id, orgId);
    if (!prospect) {
      results.push({ prospect_id: id, error: 'Not found' });
      continue;
    }

    try {
      const enrichment = await enrichProspectContact(prospect);
      await updateProspect(id, orgId, {
        contact_name: enrichment.contact_name,
        contact_email: enrichment.contact_email,
        contact_role: enrichment.contact_role,
        contact_source: enrichment.contact_source,
        status: enrichment.status,
      });

      results.push({
        prospect_id: id,
        domain: prospect.prospect_domain,
        contact_found: !!enrichment.contact_email,
        contact_email: enrichment.contact_email,
        contact_name: enrichment.contact_name,
      });
    } catch (err) {
      results.push({
        prospect_id: id,
        domain: prospect.prospect_domain,
        error: err instanceof Error ? err.message : 'Enrichment failed',
      });
    }
  }

  const found = results.filter((r) => 'contact_found' in r && r.contact_found).length;
  return {
    total: results.length,
    contacts_found: found,
    contacts_missing: results.length - found,
    results,
  };
}

async function handleGenerateOutreachEmail(input: Record<string, unknown>, orgId: string) {
  const prospectId = input.prospect_id as string;
  const prospect = await getProspectById(prospectId, orgId);
  if (!prospect) return { error: 'Prospect not found' };

  const project = await getProjectById(prospect.project_id, orgId);
  if (!project) return { error: 'Project not found' };

  const tone = (input.tone as OutreachTone) ?? 'professional';
  const isFollowup = (input.is_followup as boolean) ?? false;
  const followupNumber = (input.followup_number as number) ?? 0;

  const draft = await generateOutreachDraft(
    prospect,
    {
      prospect_id: prospectId,
      tone,
      custom_value_prop: input.custom_value_prop as string | undefined,
      is_followup: isFollowup,
      followup_number: followupNumber as 1 | 2 | undefined,
    },
    project,
  );

  const email = await createOutreachEmail({
    prospect_id: prospectId,
    org_id: orgId,
    project_id: prospect.project_id,
    subject: draft.subject,
    body_html: draft.body_html,
    body_text: draft.body_text,
    ai_generated: true,
    edited_by_user: false,
    status: 'draft',
    is_followup: isFollowup,
    followup_number: followupNumber,
  });

  if (prospect.status === 'identified' || prospect.status === 'enriched') {
    await updateProspect(prospectId, orgId, { status: 'outreach_drafted' });
  }

  return {
    email_id: email.id,
    prospect_id: prospectId,
    subject: email.subject,
    body_preview: email.body_text.slice(0, 200),
  };
}

async function handleGenerateBulkEmails(input: Record<string, unknown>, orgId: string) {
  const prospectIds = input.prospect_ids as string[];
  const tone = (input.tone as OutreachTone) ?? 'professional';
  const isFollowup = (input.is_followup as boolean) ?? false;

  const results = [];
  for (const id of prospectIds) {
    try {
      const result = await handleGenerateOutreachEmail(
        { prospect_id: id, tone, is_followup: isFollowup },
        orgId,
      );
      results.push(result);
    } catch (err) {
      results.push({
        prospect_id: id,
        error: err instanceof Error ? err.message : 'Draft generation failed',
      });
    }
  }

  const succeeded = results.filter((r) => !('error' in r)).length;
  return {
    total: results.length,
    drafted: succeeded,
    failed: results.length - succeeded,
    results,
  };
}

async function handleGetPipelineSummary(projectId: string, orgId: string) {
  const prospects = await listProspectsForProject(projectId, orgId);

  const stages: Record<string, number> = {};
  let totalContacted = 0;
  let totalReplied = 0;
  let totalWon = 0;

  for (const p of prospects) {
    stages[p.status] = (stages[p.status] ?? 0) + 1;
    if (['contacted', 'followed_up', 'won', 'lost'].includes(p.status)) {
      totalContacted++;
    }
    if (p.status === 'won') totalWon++;
  }

  // Check for replies by looking at outreach emails
  for (const p of prospects) {
    if (p.status === 'contacted' || p.status === 'followed_up' || p.status === 'won') {
      const emails = await listOutreachEmailsForProspect(p.id, orgId);
      if (emails.some((e) => e.replied_at)) totalReplied++;
    }
  }

  return {
    project_id: projectId,
    total_prospects: prospects.length,
    stages,
    reply_rate: totalContacted > 0 ? Math.round((totalReplied / totalContacted) * 100) : 0,
    win_rate: totalContacted > 0 ? Math.round((totalWon / totalContacted) * 100) : 0,
  };
}

async function handleGetProspectsNeedingAttention(projectId: string, orgId: string) {
  const prospects = await listProspectsForProject(projectId, orgId);
  const now = Date.now();
  const DAY_MS = 86400000;

  const noContact = prospects.filter(
    (p) => p.status === 'needs_manual_enrichment' || (p.status === 'identified' && !p.contact_email),
  );

  const stale = prospects.filter((p) => {
    if (['won', 'lost', 'not_relevant'].includes(p.status)) return false;
    const updatedAt = new Date(p.updated_at).getTime();
    return now - updatedAt > 14 * DAY_MS;
  });

  const followUpsDue = prospects.filter((p) => {
    if (p.status !== 'contacted') return false;
    if (!p.last_contacted_at) return false;
    const lastContact = new Date(p.last_contacted_at).getTime();
    return now - lastContact > 7 * DAY_MS;
  });

  const deadLinks = prospects.filter(
    (p) => p.status === 'won' && p.link_live === false,
  );

  return {
    no_contact: noContact.map((p) => ({ id: p.id, domain: p.prospect_domain, status: p.status })),
    stale: stale.map((p) => ({
      id: p.id,
      domain: p.prospect_domain,
      status: p.status,
      days_since_update: Math.floor((now - new Date(p.updated_at).getTime()) / DAY_MS),
    })),
    followups_due: followUpsDue.map((p) => ({
      id: p.id,
      domain: p.prospect_domain,
      days_since_contact: Math.floor((now - new Date(p.last_contacted_at!).getTime()) / DAY_MS),
    })),
    dead_links: deadLinks.map((p) => ({
      id: p.id,
      domain: p.prospect_domain,
      link_url: p.link_url,
      lost_at: p.link_lost_at,
    })),
    summary: {
      no_contact: noContact.length,
      stale: stale.length,
      followups_due: followUpsDue.length,
      dead_links: deadLinks.length,
    },
  };
}

async function handleUpdateProspectStatus(input: Record<string, unknown>, orgId: string) {
  const prospectId = input.prospect_id as string;
  const status = input.status as ProspectStatus;
  const notes = input.notes as string | undefined;

  const prospect = await getProspectById(prospectId, orgId);
  if (!prospect) return { error: 'Prospect not found' };

  const patch: Record<string, unknown> = { status };
  if (notes) {
    patch.notes = notes;
  }

  await updateProspectStatus(prospectId, orgId, status);

  return {
    prospect_id: prospectId,
    domain: prospect.prospect_domain,
    old_status: prospect.status,
    new_status: status,
  };
}

async function handleCheckLinkLive(prospectId: string, orgId: string) {
  const prospect = await getProspectById(prospectId, orgId);
  if (!prospect) return { error: 'Prospect not found' };

  const project = await getProjectById(prospect.project_id, orgId);
  if (!project) return { error: 'Project not found' };

  const result = await verifyProspectLink(prospect, project.target_url);

  await updateProspectLinkStatus(prospectId, orgId, {
    link_live: result.link_live,
    link_url: result.link_url,
    link_verified_at: result.verified_at,
    link_lost_at: result.lost_at,
    status: result.error ? 'verification_error' : prospect.status,
  });

  return {
    prospect_id: prospectId,
    domain: prospect.prospect_domain,
    link_live: result.link_live,
    link_url: result.link_url,
    verified_at: result.verified_at,
    error: result.error,
  };
}
