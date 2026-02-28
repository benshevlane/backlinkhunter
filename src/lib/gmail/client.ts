import { encrypt, decrypt } from './encryption';
import { updateEmailIntegration, getActiveEmailIntegration } from '@/src/lib/store';
import type { EmailIntegrationRecord } from '@/src/lib/types';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

export function getGmailOAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'openid',
      'email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  integration: EmailIntegrationRecord,
  orgId: string,
): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error('No refresh token available');
  }

  const refreshToken = decrypt(integration.refresh_token);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    // Token may have been revoked
    await updateEmailIntegration(integration.id, orgId, { is_active: false });
    throw new Error('Gmail token refresh failed — reconnect required');
  }

  const data: GoogleTokenResponse = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await updateEmailIntegration(integration.id, orgId, {
    access_token: encrypt(data.access_token),
    token_expires_at: expiresAt,
  });

  return data.access_token;
}

export async function getValidAccessToken(
  integration: EmailIntegrationRecord,
  orgId: string,
): Promise<string> {
  if (!integration.access_token) {
    throw new Error('No access token available');
  }

  // Check if token is near expiry (within 5 minutes)
  if (integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() > expiresAt - fiveMinutes) {
      return refreshAccessToken(integration, orgId);
    }
  }

  return decrypt(integration.access_token);
}

export function decodeIdTokenEmail(idToken: string): string | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload.email ?? null;
  } catch {
    return null;
  }
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  bodyHtml: string,
  fromEmail: string,
): Promise<{ id: string; threadId: string }> {
  // Build RFC 2822 message
  const boundary = `boundary_${Date.now()}`;
  const rawMessage = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(bodyHtml).toString('base64'),
    `--${boundary}--`,
  ].join('\r\n');

  // Base64url encode for Gmail API
  const encoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail send failed: ${text}`);
  }

  return res.json();
}
