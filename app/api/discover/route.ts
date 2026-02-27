import { NextResponse } from 'next/server';
import { discoverOpportunities } from '@/src/lib/discovery';
import type { DiscoverRequest } from '@/src/lib/types';

const allowedTypes = ['guest_post', 'resource_link', 'broken_link', 'link_exchange'] as const;

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<DiscoverRequest>;

  if (!body.project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }

  if (!body.opportunity_types || body.opportunity_types.length === 0) {
    return NextResponse.json({ error: 'opportunity_types is required' }, { status: 400 });
  }

  const hasInvalidType = body.opportunity_types.some((item) => !allowedTypes.includes(item));
  if (hasInvalidType) {
    return NextResponse.json({ error: 'invalid opportunity type' }, { status: 400 });
  }

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
