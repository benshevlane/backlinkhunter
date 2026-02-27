import { NextResponse } from 'next/server';
import { generateOutreachDraft } from '@/src/lib/outreach';
import { createOutreachEmail, getProjectById, getProspectById, updateProspect } from '@/src/lib/store';
import type { OutreachGenerateRequest, OutreachGenerateResponse } from '@/src/lib/types';

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<OutreachGenerateRequest>;

  if (!body.prospect_id) {
    return NextResponse.json({ error: 'prospect_id is required' }, { status: 400 });
  }

  if (!body.tone) {
    return NextResponse.json({ error: 'tone is required' }, { status: 400 });
  }

  const prospect = await getProspectById(body.prospect_id);
  if (!prospect) {
    return NextResponse.json({ error: 'prospect not found' }, { status: 404 });
  }

  const project = await getProjectById(prospect.project_id);
  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 });
  }

  const payload: OutreachGenerateRequest = {
    prospect_id: prospect.id,
    tone: body.tone,
    custom_value_prop: body.custom_value_prop,
    is_followup: body.is_followup ?? false,
    followup_number: body.followup_number,
  };

  const draft = generateOutreachDraft(prospect, payload, {
    target_url: project.target_url,
    niche: project.niche,
  });

  const email = await createOutreachEmail({
    prospect_id: prospect.id,
    org_id: prospect.org_id,
    project_id: prospect.project_id,
    subject: draft.subject,
    body_html: draft.body_html,
    body_text: draft.body_text,
    is_followup: payload.is_followup,
    followup_number: payload.followup_number ?? 0,
  });

  if (prospect.status === 'identified') {
    await updateProspect(prospect.id, { status: 'outreach_queued' });
  }

  const response: OutreachGenerateResponse = {
    email_id: email.id,
    subject: email.subject,
    body_html: email.body_html,
    body_text: email.body_text,
  };

  return NextResponse.json(response, { status: 201 });
}
