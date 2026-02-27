import { NextResponse } from 'next/server';
import { discoverOpportunities } from '@/src/lib/discovery';
import { requireApiAuth, isResponse, parseBody } from '@/src/lib/api-utils';
import { discoverSchema } from '@/src/lib/validations';
import type { DiscoverRequest } from '@/src/lib/types';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, discoverSchema);
  if (isResponse(body)) return body;

  const payload: DiscoverRequest = {
    project_id: body.project_id,
    seed_url: body.seed_url,
    seed_keywords: body.seed_keywords,
    opportunity_types: body.opportunity_types,
    filters: body.filters ?? {},
    limit: body.limit ?? 50,
  };

  const opportunities = discoverOpportunities(payload);
  return NextResponse.json({ opportunities });
}
