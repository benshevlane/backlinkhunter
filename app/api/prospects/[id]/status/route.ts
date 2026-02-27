import { NextResponse } from 'next/server';
import { updateProspectStatus } from '@/src/lib/store';
import type { ProspectStatus } from '@/src/lib/types';

interface Context {
  params: { id: string };
}

const statuses: ProspectStatus[] = [
  'identified',
  'outreach_queued',
  'contacted',
  'followed_up',
  'won',
  'lost',
  'not_relevant',
  'needs_manual_enrichment',
  'verification_error',
];

export async function PATCH(request: Request, context: Context) {
  const body = (await request.json()) as { status?: ProspectStatus };
  if (!body.status || !statuses.includes(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  try {
    const prospect = await updateProspectStatus(context.params.id, body.status);
    return NextResponse.json({ prospect });
  } catch (error) {
    if (error instanceof Error && error.message === 'prospect_not_found') {
      return NextResponse.json({ error: 'prospect not found' }, { status: 404 });
    }
    throw error;
  }
}
