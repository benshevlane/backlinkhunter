import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, decodeIdTokenEmail } from '@/src/lib/gmail/client';
import { encrypt } from '@/src/lib/gmail/encryption';
import { upsertEmailIntegration } from '@/src/lib/store';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=oauth_denied', request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=missing_params', request.url),
    );
  }

  let stateData: { userId: string; orgId: string };
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=invalid_state', request.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const emailAddress = tokens.id_token
      ? decodeIdTokenEmail(tokens.id_token)
      : null;

    if (!emailAddress) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_email', request.url),
      );
    }

    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    await upsertEmailIntegration({
      org_id: stateData.orgId,
      user_id: stateData.userId,
      provider: 'gmail',
      email_address: emailAddress,
      access_token: encrypt(tokens.access_token),
      refresh_token: encrypt(tokens.refresh_token ?? ''),
      token_expires_at: expiresAt,
      is_active: true,
    });

    return NextResponse.redirect(
      new URL('/settings/integrations?success=gmail_connected', request.url),
    );
  } catch (err) {
    console.error('Gmail OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=token_exchange', request.url),
    );
  }
}
