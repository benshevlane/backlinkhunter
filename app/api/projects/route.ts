import { NextResponse } from 'next/server';
import { createProject, listProjects } from '@/src/lib/store';
import { requireApiAuth, isResponse, parseBody } from '@/src/lib/api-utils';
import { createProjectSchema } from '@/src/lib/validations';

export async function GET() {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const projects = await listProjects(auth.orgId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, createProjectSchema);
  if (isResponse(body)) return body;

  const project = await createProject(auth.orgId, {
    name: body.name,
    target_url: body.target_url,
    niche: body.niche,
    target_keywords: body.target_keywords,
  });

  return NextResponse.json({ project }, { status: 201 });
}
