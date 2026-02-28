import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/src/lib/cron-auth';
import { createServiceSupabase } from '@/src/lib/supabase/service';
import { getValidAccessToken } from '@/src/lib/gmail/client';
import { logger } from '@/src/lib/logger';
import type { EmailIntegrationRecord, OutreachEmailRecord } from '@/src/lib/types';

const log = logger.create('cron-reply-detection');

interface GmailThread {
  id: string;
  messages?: GmailMessage[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

export async function GET(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  const supabase = createServiceSupabase();

  // 1. Get all active email integrations
  const { data: integrations, error: intError } = await supabase
    .from('email_integrations')
    .select('*')
    .eq('is_active', true);

  if (intError) {
    log.error('Failed to fetch integrations', { error: intError.message });
    return NextResponse.json({ error: intError.message }, { status: 500 });
  }

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ checked: 0, replies_found: 0 });
  }

  let totalChecked = 0;
  let totalReplies = 0;

  for (const integration of integrations as EmailIntegrationRecord[]) {
    try {
      const result = await checkRepliesForIntegration(supabase, integration);
      totalChecked += result.checked;
      totalReplies += result.replies;

      // Update last_reply_checked_at
      await supabase
        .from('email_integrations')
        .update({ last_reply_checked_at: new Date().toISOString() })
        .eq('id', integration.id);
    } catch (err) {
      log.error('Reply check failed for integration', {
        integration_id: integration.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  log.info('Reply detection complete', { checked: totalChecked, replies: totalReplies });
  return NextResponse.json({ checked: totalChecked, replies_found: totalReplies });
}

async function checkRepliesForIntegration(
  supabase: ReturnType<typeof createServiceSupabase>,
  integration: EmailIntegrationRecord,
) {
  // Get valid access token (refresh if needed)
  const accessToken = await getValidAccessToken(integration, integration.org_id);

  // Get sent outreach emails for this org that have a gmail_message_id but no reply yet
  const { data: sentEmails, error: emailsError } = await supabase
    .from('outreach_emails')
    .select('*')
    .eq('org_id', integration.org_id)
    .eq('status', 'sent')
    .not('gmail_message_id', 'is', null)
    .is('replied_at', null);

  if (emailsError) {
    throw new Error(`Failed to fetch sent emails: ${emailsError.message}`);
  }

  if (!sentEmails || sentEmails.length === 0) {
    return { checked: 0, replies: 0 };
  }

  let replies = 0;

  for (const email of sentEmails as OutreachEmailRecord[]) {
    try {
      const hasReply = await checkGmailThread(accessToken, email);
      if (hasReply) {
        await supabase
          .from('outreach_emails')
          .update({
            replied_at: hasReply.repliedAt,
            reply_snippet: hasReply.snippet,
          })
          .eq('id', email.id)
          .eq('org_id', email.org_id);

        // Update prospect status to 'won' on reply (optimistic)
        await supabase
          .from('prospects')
          .update({ status: 'won' })
          .eq('id', email.prospect_id)
          .eq('org_id', email.org_id)
          .in('status', ['contacted', 'followed_up']);

        replies++;
        log.info('Reply detected', { email_id: email.id, prospect_id: email.prospect_id });
      }
    } catch (err) {
      log.warn('Failed to check thread for email', {
        email_id: email.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return { checked: sentEmails.length, replies };
}

async function checkGmailThread(
  accessToken: string,
  email: OutreachEmailRecord,
): Promise<{ repliedAt: string; snippet: string } | null> {
  // Get the thread for this message
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${email.gmail_message_id}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!res.ok) {
    // Message might have been deleted or thread not found — try by message ID
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmail_message_id}?format=metadata&metadataHeaders=X-GM-THRID`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!msgRes.ok) return null;

    const msg: GmailMessage = await msgRes.json();
    if (!msg.threadId) return null;

    // Fetch the full thread
    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${msg.threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!threadRes.ok) return null;

    const thread: GmailThread = await threadRes.json();
    return findReplyInThread(thread, email.gmail_message_id!);
  }

  const thread: GmailThread = await res.json();
  return findReplyInThread(thread, email.gmail_message_id!);
}

function findReplyInThread(
  thread: GmailThread,
  ourMessageId: string,
): { repliedAt: string; snippet: string } | null {
  if (!thread.messages || thread.messages.length <= 1) return null;

  // Find messages after ours (replies)
  const ourIndex = thread.messages.findIndex((m) => m.id === ourMessageId);
  if (ourIndex === -1 || ourIndex === thread.messages.length - 1) return null;

  // The first message after ours is the reply
  const reply = thread.messages[ourIndex + 1];
  const repliedAt = reply.internalDate
    ? new Date(parseInt(reply.internalDate, 10)).toISOString()
    : new Date().toISOString();

  return {
    repliedAt,
    snippet: reply.snippet ?? '',
  };
}
