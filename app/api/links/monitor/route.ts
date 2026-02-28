import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { linkMonitorSchema } from '@/src/lib/validations';
import { getProjectById, listWonProspectsForProject, updateProspectLinkStatus } from '@/src/lib/store';
import { verifyProspectLink } from '@/src/lib/link-verification';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, linkMonitorSchema);
  if (isResponse(body)) return body;

  const project = await getProjectById(body.project_id, auth.orgId);
  if (!project) return notFound('Project not found');

  const prospects = await listWonProspectsForProject(body.project_id, auth.orgId);

  const results = [];
  for (const prospect of prospects) {
    const result = await verifyProspectLink(prospect, project.target_url);

    await updateProspectLinkStatus(prospect.id, auth.orgId, {
      link_live: result.link_live,
      link_url: result.link_url,
      link_verified_at: result.verified_at,
      link_lost_at: result.lost_at,
      status: result.error ? 'verification_error' : prospect.status,
    });

    results.push({
      prospect_id: prospect.id,
      prospect_domain: prospect.prospect_domain,
      link_live: result.link_live,
      error: result.error ?? null,
    });
  }

  const live = results.filter((r) => r.link_live).length;
  const lost = results.filter((r) => !r.link_live && !r.error).length;
  const errors = results.filter((r) => r.error).length;

  return NextResponse.json({
    project_id: body.project_id,
    total_checked: results.length,
    live,
    lost,
    errors,
    results,
  });
}
