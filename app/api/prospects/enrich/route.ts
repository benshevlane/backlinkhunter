import { NextResponse } from 'next/server';
import { enrichProspectContact } from '@/src/lib/enrichment';
import { getProspectById, updateProspect } from '@/src/lib/store';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { enrichProspectSchema } from '@/src/lib/validations';
import type { EnrichProspectResponse } from '@/src/lib/types';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, enrichProspectSchema);
  if (isResponse(body)) return body;

  const prospect = await getProspectById(body.prospect_id, auth.orgId);
  if (!prospect) {
    return notFound('prospect not found');
  }

  const enrichment = enrichProspectContact(prospect);
  const updated = await updateProspect(prospect.id, auth.orgId, {
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
