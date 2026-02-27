import { NextResponse } from 'next/server';
import { createProspect, listProspectsForProject } from '@/src/lib/store';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { createProspectSchema } from '@/src/lib/validations';

interface Context {
  params: { id: string };
}

export async function GET(_: Request, context: Context) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const prospects = await listProspectsForProject(context.params.id, auth.orgId);
  return NextResponse.json({ prospects });
}

export async function POST(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, createProspectSchema);
  if (isResponse(body)) return body;

  try {
    const prospect = await createProspect(context.params.id, auth.orgId, {
      prospect_url: body.prospect_url,
      opportunity_type: body.opportunity_type,
      contact_email: body.contact_email,
    });
    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) {
      return notFound('invalid prospect_url');
    }
    throw error;
  }
}
