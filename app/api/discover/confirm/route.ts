import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody, notFound, badRequest } from '@/src/lib/api-utils';
import { discoverConfirmSchema } from '@/src/lib/validations';
import { getProjectById, getImportJobById, createProspectsBulk, updateImportJob, getOrganisation, incrementProspectsUsed } from '@/src/lib/store';
import { checkProspectQuota } from '@/src/lib/quota';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, discoverConfirmSchema);
  if (isResponse(body)) return body;

  // Look up the import job to find the project_id
  const existingJob = await getImportJobById(body.job_id, auth.orgId);
  if (!existingJob) return notFound('Import job not found');

  const project = await getProjectById(existingJob.project_id, auth.orgId);
  if (!project) return notFound('Project not found');

  // Check quota before creating prospects
  const org = await getOrganisation(auth.orgId);
  if (org) {
    const quota = checkProspectQuota(org, body.selected_urls.length);
    if (!quota.allowed) {
      return badRequest(`Quota exceeded: ${quota.remaining} prospects remaining this month (plan: ${quota.plan})`);
    }
  }

  const prospects = body.selected_urls.map((url) => {
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domain = url;
    }
    return {
      prospect_url: url,
      prospect_domain: domain,
      entry_method: 'discovery' as const,
    };
  });

  const created = await createProspectsBulk(project.id, auth.orgId, prospects);

  // Increment usage counter
  if (org && created.length > 0) {
    await incrementProspectsUsed(auth.orgId, created.length);
  }

  await updateImportJob(existingJob.id, auth.orgId, {
    status: 'complete',
    total_passed: created.length,
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    job_id: existingJob.id,
    prospects_created: created.length,
    project_id: project.id,
  }, { status: 201 });
}
