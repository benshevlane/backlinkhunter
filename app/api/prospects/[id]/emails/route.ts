import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, notFound } from '@/src/lib/api-utils';
import { getProspectById, listOutreachEmailsForProspect } from '@/src/lib/store';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const prospect = await getProspectById(params.id, auth.orgId);
  if (!prospect) return notFound('Prospect not found');

  const emails = await listOutreachEmailsForProspect(params.id, auth.orgId);

  return NextResponse.json({ emails });
}
