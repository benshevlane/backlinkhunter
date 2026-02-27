import { NextResponse } from 'next/server';
import { listOutreachEmailsForProject } from '@/src/lib/store';

interface Context {
  params: { id: string };
}

export async function GET(_: Request, context: Context) {
  const emails = await listOutreachEmailsForProject(context.params.id);
  return NextResponse.json({ emails });
}
