import { NextResponse } from 'next/server';
import { createProject, listProjects, upsertExistingBacklinks } from '@/src/lib/store';
import { requireApiAuth, isResponse, parseBody } from '@/src/lib/api-utils';
import { createProjectSchema } from '@/src/lib/validations';
import { getBacklinks } from '@/src/lib/integrations/dataforseo';
import { logger } from '@/src/lib/logger';

const log = logger.create('projects');

export async function GET() {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const projects = await listProjects(auth.orgId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, createProjectSchema);
  if (isResponse(body)) return body;

  const project = await createProject(auth.orgId, {
    name: body.name,
    target_url: body.target_url,
    niche: body.niche,
    target_keywords: body.target_keywords,
    description: body.description,
    domain_rating: body.domain_rating,
    target_audience: body.target_audience,
  });

  // Step 2: Fetch existing backlink profile in the background
  // This runs after the response is sent so the user doesn't wait
  fetchAndStoreBacklinks(project.id, auth.orgId, body.target_url).catch((err) => {
    log.error('Failed to fetch backlinks', { projectId: project.id, error: String(err) });
  });

  return NextResponse.json({ project }, { status: 201 });
}

async function fetchAndStoreBacklinks(projectId: string, orgId: string, targetUrl: string) {
  const domain = new URL(targetUrl).hostname.replace(/^www\./, '');
  log.info('Fetching existing backlinks', { domain, projectId });

  const backlinks = await getBacklinks(domain);
  if (backlinks.length === 0) {
    log.info('No backlinks found', { domain });
    return;
  }

  await upsertExistingBacklinks(projectId, orgId, backlinks);
  log.info('Stored existing backlinks', { domain, count: backlinks.length });
}
