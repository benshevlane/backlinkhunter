import { NextResponse } from 'next/server';
import { updateProspectStatus } from '@/src/lib/store';
import { requireApiAuth, isResponse, parseBody, notFound } from '@/src/lib/api-utils';
import { updateProspectStatusSchema } from '@/src/lib/validations';

interface Context {
  params: { id: string };
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, updateProspectStatusSchema);
  if (isResponse(body)) return body;

  try {
    const prospect = await updateProspectStatus(context.params.id, auth.orgId, body.status);
    return NextResponse.json({ prospect });
  } catch (error) {
    if (error instanceof Error && error.message?.includes('PGRST116')) {
      return notFound('prospect not found');
    }
    throw error;
  }
}
