import { notImplemented, requireApiAuth, isResponse } from '@/src/lib/api-utils';

export async function POST() {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;
  return notImplemented('/alerts/check');
}
