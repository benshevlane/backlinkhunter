import { NextResponse } from 'next/server';
import { createProspect, listProspectsForProject } from '@/src/lib/store';

interface Context {
  params: { id: string };
}

export async function GET(_: Request, context: Context) {
  const prospects = await listProspectsForProject(context.params.id);
  return NextResponse.json({ prospects });
}

export async function POST(request: Request, context: Context) {
  const body = (await request.json()) as {
    prospect_url?: string;
    opportunity_type?: 'guest_post' | 'resource_link' | 'broken_link' | 'link_exchange' | 'mention';
    contact_email?: string;
  };

  if (!body.prospect_url) {
    return NextResponse.json({ error: 'prospect_url is required' }, { status: 400 });
  }

  try {
    const prospect = await createProspect(context.params.id, {
      prospect_url: body.prospect_url,
      opportunity_type: body.opportunity_type,
      contact_email: body.contact_email,
    });
    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'project_not_found') {
      return NextResponse.json({ error: 'project not found' }, { status: 404 });
    }
    if (error instanceof TypeError) {
      return NextResponse.json({ error: 'invalid prospect_url' }, { status: 400 });
    }
    throw error;
  }
}
