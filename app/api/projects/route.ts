import { NextResponse } from 'next/server';
import { createProject, listProjects } from '@/src/lib/store';

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    target_url?: string;
    niche?: string;
    target_keywords?: string[];
  };

  if (!body.name || !body.target_url) {
    return NextResponse.json({ error: 'name and target_url are required' }, { status: 400 });
  }

  const project = await createProject({
    name: body.name,
    target_url: body.target_url,
    niche: body.niche,
    target_keywords: body.target_keywords,
  });

  return NextResponse.json({ project }, { status: 201 });
}
