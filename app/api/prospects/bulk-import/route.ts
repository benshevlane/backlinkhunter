import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody, notFound, badRequest } from '@/src/lib/api-utils';
import { bulkImportValidateSchema, bulkImportConfirmSchema } from '@/src/lib/validations';
import { getProjectById, getImportJobById, createImportJob, updateImportJob, createProspectsBulk, getOrganisation, incrementProspectsUsed } from '@/src/lib/store';
import { validateImportUrls } from '@/src/lib/import-validation';
import { checkProspectQuota } from '@/src/lib/quota';
import type { BulkImportResponse } from '@/src/lib/types';

/**
 * POST /api/prospects/bulk-import
 * Two-phase: send with `urls` to validate, or with `job_id` + `approved_urls` to confirm.
 *
 * We peek at the raw body to determine which phase, then re-parse with the
 * correct Zod schema for proper validation.
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return badRequest('invalid JSON body');
  }

  // Phase 2: Confirm import (has job_id + approved_urls)
  if (raw.job_id && raw.approved_urls) {
    const parsed = bulkImportConfirmSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 },
      );
    }
    return handleConfirm(parsed.data, auth.orgId);
  }

  // Phase 1: Validate URLs
  const parsed = bulkImportValidateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
      { status: 400 },
    );
  }
  return handleValidate(parsed.data, auth.orgId);
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

  // Check quota before creating prospects
  const org = await getOrganisation(orgId);
  if (org) {
    const quota = checkProspectQuota(org, body.approved_urls.length);
    if (!quota.allowed) {
      return badRequest(`Quota exceeded: ${quota.remaining} prospects remaining this month (plan: ${quota.plan})`);
    }
  }

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

  // Increment usage counter
  if (org && created.length > 0) {
    await incrementProspectsUsed(orgId, created.length);
  }

  return NextResponse.json({
    job_id: job.id,
    prospects_created: created.length,
    project_id: job.project_id,
  }, { status: 201 });
}
