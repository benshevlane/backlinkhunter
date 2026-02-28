import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, badRequest, notFound } from '@/src/lib/api-utils';
import {
  getOutreachEmailById,
  getProspectById,
  getActiveEmailIntegration,
  updateOutreachEmail,
  updateProspect,
} from '@/src/lib/store';
import { getValidAccessToken, sendGmailMessage } from '@/src/lib/gmail/client';
import { logger } from '@/src/lib/logger';

const log = logger.create('outreach-send');

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  let body: { email_id: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.email_id) {
    return badRequest('email_id is required');
  }

  // 1. Load the outreach email
  const email = await getOutreachEmailById(body.email_id, auth.orgId);
  if (!email) return notFound('Outreach email not found');

  if (email.status === 'sent') {
    return badRequest('Email has already been sent');
  }

  // 2. Load the prospect to get contact email
  const prospect = await getProspectById(email.prospect_id, auth.orgId);
  if (!prospect) return notFound('Prospect not found');

  if (!prospect.contact_email) {
    return badRequest('Prospect has no contact email — enrich first');
  }

  // 3. Get active email integration
  const integration = await getActiveEmailIntegration(auth.orgId, auth.userId);
  if (!integration) {
    return NextResponse.json(
      { error: 'No email integration connected. Connect Gmail in Settings > Integrations.' },
      { status: 422 },
    );
  }

  // 4. Get valid access token (refreshes if needed)
  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(integration, auth.orgId);
  } catch (err) {
    log.error('Token refresh failed', { error: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json(
      { error: 'Gmail token expired — please reconnect in Settings > Integrations.' },
      { status: 422 },
    );
  }

  // 5. Send via Gmail API
  try {
    const result = await sendGmailMessage(
      accessToken,
      prospect.contact_email,
      email.subject,
      email.body_html,
      integration.email_address,
    );

    log.info('Email sent', { email_id: email.id, gmail_id: result.id });

    const now = new Date().toISOString();

    // 6. Update outreach email record
    await updateOutreachEmail(email.id, auth.orgId, {
      status: 'sent',
      sent_at: now,
      gmail_message_id: result.id,
    });

    // 7. Update prospect status
    const newStatus = email.is_followup ? 'followed_up' : 'contacted';
    await updateProspect(prospect.id, auth.orgId, { status: newStatus });

    return NextResponse.json({
      success: true,
      email_id: email.id,
      gmail_message_id: result.id,
      sent_at: now,
    });
  } catch (err) {
    log.error('Gmail send failed', {
      email_id: email.id,
      error: err instanceof Error ? err.message : 'unknown',
    });

    await updateOutreachEmail(email.id, auth.orgId, {
      status: 'failed',
    });

    return NextResponse.json(
      { error: `Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 502 },
    );
  }
}
