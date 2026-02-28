import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { discoverConfirmSchema } from '@/src/lib/validations';
import { getProjectById, createProspectsBulk, createImportJob, updateImportJob } from '@/src/lib/store';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, discoverConfirmSchema);
  if (isResponse(body)) return body;

  // job_id here acts as project_id for discovery confirmation
  const project = await getProjectById(body.job_id, auth.orgId);
  if (!project) return notFound('Project not found');

  const job = await createImportJob(project.id, auth.orgId, {
    entry_method: 'discovery',
    total_submitted: body.selected_urls.length,
  });

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

  await updateImportJob(job.id, auth.orgId, {
    status: 'complete',
    total_passed: created.length,
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    job_id: job.id,
    prospects_created: created.length,
    project_id: project.id,
  }, { status: 201 });
}
