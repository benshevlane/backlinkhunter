import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { bulkImportValidateSchema, bulkImportConfirmSchema } from '@/src/lib/validations';
import { getProjectById, getImportJobById, createImportJob, updateImportJob, createProspectsBulk } from '@/src/lib/store';
import { validateImportUrls } from '@/src/lib/import-validation';
import type { BulkImportResponse } from '@/src/lib/types';

/**
 * POST /api/prospects/bulk-import
 * Two-phase: send with `urls` to validate, or with `job_id` + `approved_urls` to confirm.
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const raw = await request.clone().json().catch(() => ({}));

  // Phase 2: Confirm import
  if (raw.job_id && raw.approved_urls) {
    const body = await parseBody(request, bulkImportConfirmSchema);
    if (isResponse(body)) return body;
    return handleConfirm(body, auth.orgId);
  }

  // Phase 1: Validate URLs
  const body = await parseBody(request, bulkImportValidateSchema);
  if (isResponse(body)) return body;
  return handleValidate(body, auth.orgId);
}

async function handleValidate(
  body: { project_id: string; urls: string[]; thresholds: { min_da: number; min_relevance: number; max_spam_score: number } },
  orgId: string,
) {
  const project = await getProjectById(body.project_id, orgId);
  if (!project) return notFound('Project not found');

  const job = await createImportJob(project.id, orgId, {
    entry_method: 'import',
    total_submitted: body.urls.length,
    input_payload: { urls: body.urls, thresholds: body.thresholds },
  });

  await updateImportJob(job.id, orgId, { status: 'running' });

  const results = await validateImportUrls(body.urls, project.id, orgId, body.thresholds);

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.bucket === 'pass').length,
    review: results.filter((r) => r.bucket === 'review').length,
    failed: results.filter((r) => r.bucket === 'fail').length,
  };

  await updateImportJob(job.id, orgId, {
    status: 'complete',
    total_passed: summary.passed,
    total_review: summary.review,
    total_failed: summary.failed,
    results_payload: { results } as Record<string, unknown>,
    completed_at: new Date().toISOString(),
  });

  const response: BulkImportResponse = {
    job_id: job.id,
    results,
    summary,
  };

  return NextResponse.json(response);
}

async function handleConfirm(
  body: { job_id: string; approved_urls: string[] },
  orgId: string,
) {
  const job = await getImportJobById(body.job_id, orgId);
  if (!job) return notFound('Import job not found');

  const prospects = body.approved_urls.map((url) => {
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domain = url;
    }
    return {
      prospect_url: url,
      prospect_domain: domain,
      entry_method: 'import' as const,
    };
  });

  const created = await createProspectsBulk(job.project_id, orgId, prospects);

  return NextResponse.json({
    job_id: job.id,
    prospects_created: created.length,
    project_id: job.project_id,
  }, { status: 201 });
}
