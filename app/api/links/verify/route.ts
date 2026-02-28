import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { linkVerifySchema } from '@/src/lib/validations';
import { getProspectById, getProjectById, updateProspectLinkStatus } from '@/src/lib/store';
import { verifyProspectLink } from '@/src/lib/link-verification';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, linkVerifySchema);
  if (isResponse(body)) return body;

  const prospect = await getProspectById(body.prospect_id, auth.orgId);
  if (!prospect) return notFound('Prospect not found');

  const project = await getProjectById(prospect.project_id, auth.orgId);
  if (!project) return notFound('Project not found');

  const result = await verifyProspectLink(prospect, project.target_url);

  const updated = await updateProspectLinkStatus(prospect.id, auth.orgId, {
    link_live: result.link_live,
    link_url: result.link_url,
    link_verified_at: result.verified_at,
    link_lost_at: result.lost_at,
    status: result.error ? 'verification_error' : prospect.status,
  });

  return NextResponse.json({
    prospect: updated,
    verification: {
      link_live: result.link_live,
      verified_at: result.verified_at,
      error: result.error ?? null,
    },
  });
}
