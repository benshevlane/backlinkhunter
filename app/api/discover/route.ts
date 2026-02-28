import { NextResponse } from 'next/server';
import { discoverOpportunities } from '@/src/lib/discovery';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { discoverSchema } from '@/src/lib/validations';
import { getProjectById, createImportJob, updateImportJob } from '@/src/lib/store';
import type { DiscoverRequest } from '@/src/lib/types';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, discoverSchema);
  if (isResponse(body)) return body;

  const project = await getProjectById(body.project_id, auth.orgId);
  if (!project) return notFound('Project not found');

  const payload: DiscoverRequest = {
    project_id: body.project_id,
    seed_url: body.seed_url,
    seed_keywords: body.seed_keywords,
    opportunity_types: body.opportunity_types,
    filters: body.filters ?? {},
    limit: body.limit ?? 50,
  };

  const opportunities = await discoverOpportunities(
    payload,
    auth.orgId,
    project.target_keywords,
  );

  // Create an import_job to track this discovery run so confirm can reference it
  const job = await createImportJob(project.id, auth.orgId, {
    entry_method: 'discovery',
    total_submitted: opportunities.length,
    input_payload: { seed_keywords: body.seed_keywords, seed_url: body.seed_url, opportunity_types: body.opportunity_types },
  });

  await updateImportJob(job.id, auth.orgId, {
    status: 'complete',
    total_passed: opportunities.length,
    results_payload: { opportunities } as Record<string, unknown>,
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({ job_id: job.id, opportunities });
}
