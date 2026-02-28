import { notImplemented } from '@/src/lib/api-utils';

// Stripe webhooks are verified via signature, not user auth
export async function POST() {
  return notImplemented('/stripe/webhook');
}
