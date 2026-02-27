import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ProjectRecord, ProspectRecord, ProspectStatus } from '@/src/lib/types';

interface StoreSchema {
  projects: ProjectRecord[];
  prospects: ProspectRecord[];
}

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'dev-store.json');

async function readStore(): Promise<StoreSchema> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as StoreSchema;
  } catch {
    const initial: StoreSchema = { projects: [], prospects: [] };
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
