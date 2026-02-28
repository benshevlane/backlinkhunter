import { NextResponse } from 'next/server';
import { generateOutreachDraft } from '@/src/lib/outreach';
import { createOutreachEmail, getProjectById, getProspectById, updateProspect } from '@/src/lib/store';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { outreachGenerateSchema } from '@/src/lib/validations';
import type { OutreachGenerateResponse } from '@/src/lib/types';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, outreachGenerateSchema);
  if (isResponse(body)) return body;

  const prospect = await getProspectById(body.prospect_id, auth.orgId);
  if (!prospect) {
    return notFound('prospect not found');
  }

  const project = await getProjectById(prospect.project_id, auth.orgId);
  if (!project) {
    return notFound('project not found');
  }

  const draft = generateOutreachDraft(prospect, body, {
    target_url: project.target_url,
    niche: project.niche,
  });

  const email = await createOutreachEmail({
    prospect_id: prospect.id,
    org_id: auth.orgId,
    project_id: prospect.project_id,
    subject: draft.subject,
    body_html: draft.body_html,
    body_text: draft.body_text,
    ai_generated: true,
    edited_by_user: false,
    status: 'draft',
    is_followup: body.is_followup,
    followup_number: body.followup_number ?? 0,
  });

  if (prospect.status === 'identified') {
    await updateProspect(prospect.id, auth.orgId, { status: 'outreach_queued' });
  }

  const response: OutreachGenerateResponse = {
    email_id: email.id,
    subject: email.subject,
    body_html: email.body_html,
    body_text: email.body_text,
  };

  return NextResponse.json(response, { status: 201 });
}
