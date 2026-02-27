import { NextResponse } from 'next/server';
import { enrichProspectContact } from '@/src/lib/enrichment';
import { getProspectById, updateProspect } from '@/src/lib/store';
import type { EnrichProspectRequest, EnrichProspectResponse } from '@/src/lib/types';

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<EnrichProspectRequest>;
  if (!body.prospect_id) {
    return NextResponse.json({ error: 'prospect_id is required' }, { status: 400 });
  }

  const prospect = await getProspectById(body.prospect_id);
  if (!prospect) {
    return NextResponse.json({ error: 'prospect not found' }, { status: 404 });
  }

  const enrichment = enrichProspectContact(prospect);
  const updated = await updateProspect(prospect.id, {
    contact_name: enrichment.contact_name,
    contact_email: enrichment.contact_email,
    contact_role: enrichment.contact_role,
    contact_source: enrichment.contact_source,
    status: enrichment.status,
  });

  const response: EnrichProspectResponse = {
    prospect: updated,
    enrichment: {
      contact_name: enrichment.contact_name,
      contact_email: enrichment.contact_email,
      contact_role: enrichment.contact_role,
      contact_source: enrichment.contact_source,
    },
  };

  return NextResponse.json(response);
}
