import { NextResponse } from 'next/server';
import { listOutreachEmailsForProject } from '@/src/lib/store';
import { requireApiAuth, isResponse } from '@/src/lib/api-utils';

interface Context {
  params: { id: string };
}

export async function GET(_: Request, context: Context) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const emails = await listOutreachEmailsForProject(context.params.id, auth.orgId);
  return NextResponse.json({ emails });
}
