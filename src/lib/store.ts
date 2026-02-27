import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { OutreachEmailRecord, ProjectRecord, ProspectRecord, ProspectStatus } from '@/src/lib/types';

interface StoreSchema {
  projects: ProjectRecord[];
  prospects: ProspectRecord[];
  outreach_emails: OutreachEmailRecord[];
}

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'dev-store.json');

async function readStore(): Promise<StoreSchema> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreSchema>;
    return {
      projects: parsed.projects ?? [],
      prospects: parsed.prospects ?? [],
      outreach_emails: parsed.outreach_emails ?? [],
    };
  } catch {
    const initial: StoreSchema = { projects: [], prospects: [], outreach_emails: [] };
    await writeFile(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

async function writeStore(store: StoreSchema) {
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export async function listProjects() {
  const store = await readStore();
  return store.projects;
}

export async function getProjectById(projectId: string) {
  const store = await readStore();
  return store.projects.find((item) => item.id === projectId) ?? null;
}

export async function createProject(input: {
  name: string;
  target_url: string;
  niche?: string;
  target_keywords?: string[];
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: randomUUID(),
    org_id: 'local-dev-org',
    name: input.name,
    target_url: input.target_url,
    niche: input.niche ?? null,
    target_keywords: input.target_keywords ?? [],
    created_at: now,
  };
  store.projects.unshift(project);
  await writeStore(store);
  return project;
}

export async function listProspectsForProject(projectId: string) {
  const store = await readStore();
  return store.prospects.filter((item) => item.project_id === projectId);
}

export async function getProspectById(prospectId: string) {
  const store = await readStore();
  return store.prospects.find((item) => item.id === prospectId) ?? null;
}

export async function createProspect(
  projectId: string,
  input: { prospect_url: string; opportunity_type?: ProspectRecord['opportunity_type']; contact_email?: string },
) {
  const store = await readStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error('project_not_found');
  }

  const domain = new URL(input.prospect_url).hostname.replace(/^www\./, '');
  const now = new Date().toISOString();
  const prospect: ProspectRecord = {
    id: randomUUID(),
    project_id: projectId,
    org_id: project.org_id,
    prospect_url: input.prospect_url,
    prospect_domain: domain,
    page_title: null,
    page_url: null,
    snippet: null,
    domain_authority: null,
    page_authority: null,
    spam_score: null,
    referring_domains: null,
    monthly_traffic: null,
    contact_name: null,
    contact_email: input.contact_email ?? null,
    contact_role: null,
    contact_linkedin_url: null,
    contact_source: input.contact_email ? 'manual' : null,
    opportunity_type: input.opportunity_type ?? 'guest_post',
    linkability_score: null,
    relevance_score: null,
    status: 'identified',
    first_contacted_at: null,
    last_contacted_at: null,
    link_live: false,
    link_url: null,
    link_verified_at: null,
    link_lost_at: null,
    notes: null,
    tags: [],
    created_at: now,
    updated_at: now,
  };

  store.prospects.unshift(prospect);
  await writeStore(store);
  return prospect;
}

export async function updateProspectStatus(id: string, status: ProspectStatus) {
  const store = await readStore();
  const idx = store.prospects.findIndex((item) => item.id === id);
  if (idx < 0) {
    throw new Error('prospect_not_found');
  }
  store.prospects[idx] = {
    ...store.prospects[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  await writeStore(store);
  return store.prospects[idx];
}

export async function updateProspect(id: string, patch: Partial<ProspectRecord>) {
  const store = await readStore();
  const idx = store.prospects.findIndex((item) => item.id === id);
  if (idx < 0) {
    throw new Error('prospect_not_found');
  }
  store.prospects[idx] = {
    ...store.prospects[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await writeStore(store);
  return store.prospects[idx];
}

export async function createOutreachEmail(
  input: Omit<OutreachEmailRecord, 'id' | 'created_at' | 'status' | 'ai_generated' | 'edited_by_user'> & {
    status?: OutreachEmailRecord['status'];
    ai_generated?: boolean;
    edited_by_user?: boolean;
  },
) {
  const store = await readStore();
  const email: OutreachEmailRecord = {
    id: randomUUID(),
    prospect_id: input.prospect_id,
    org_id: input.org_id,
    project_id: input.project_id,
    subject: input.subject,
    body_html: input.body_html,
    body_text: input.body_text,
    ai_generated: input.ai_generated ?? true,
    edited_by_user: input.edited_by_user ?? false,
    status: input.status ?? 'draft',
    is_followup: input.is_followup,
    followup_number: input.followup_number,
    created_at: new Date().toISOString(),
  };

  store.outreach_emails.unshift(email);
  await writeStore(store);
  return email;
}

export async function listOutreachEmailsForProspect(prospectId: string) {
  const store = await readStore();
  return store.outreach_emails.filter((item) => item.prospect_id === prospectId);
}
