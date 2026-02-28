import { notImplemented } from '@/src/lib/api-utils';

// Webhooks are unauthenticated — they come from external services
export async function POST() {
  return notImplemented('/outreach/webhook/reply');
}
