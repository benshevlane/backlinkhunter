import { NextResponse } from 'next/server';
import { discoverOpportunities } from '@/src/lib/discovery';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { discoverSchema } from '@/src/lib/validations';
import { getProjectById } from '@/src/lib/store';
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

  return NextResponse.json({ opportunities });
}
