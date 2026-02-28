import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse } from '@/src/lib/api-utils';
import { getGmailOAuthUrl } from '@/src/lib/gmail/client';

export async function GET() {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const state = Buffer.from(
    JSON.stringify({ userId: auth.userId, orgId: auth.orgId }),
  ).toString('base64url');

  const url = getGmailOAuthUrl(state);

  return NextResponse.json({ url });
}
