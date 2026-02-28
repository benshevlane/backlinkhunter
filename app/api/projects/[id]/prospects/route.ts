import { NextResponse } from 'next/server';
import { createProspect, listProspectsForProject, getOrganisation, incrementProspectsUsed } from '@/src/lib/store';
import { requireApiAuth, isResponse, parseBody, notFound, badRequest } from '@/src/lib/api-utils';
import { createProspectSchema } from '@/src/lib/validations';
import { checkProspectQuota } from '@/src/lib/quota';

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

  // Check quota before creating
  const org = await getOrganisation(auth.orgId);
  if (org) {
    const quota = checkProspectQuota(org, 1);
    if (!quota.allowed) {
      return badRequest(`Quota exceeded: ${quota.remaining} prospects remaining this month (plan: ${quota.plan})`);
    }
  }

  try {
    const prospect = await createProspect(context.params.id, auth.orgId, {
      prospect_url: body.prospect_url,
      opportunity_type: body.opportunity_type,
      contact_email: body.contact_email,
    });

    // Increment usage counter
    if (org) {
      await incrementProspectsUsed(auth.orgId, 1);
    }

    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) {
      return notFound('invalid prospect_url');
    }
    throw error;
  }
}
