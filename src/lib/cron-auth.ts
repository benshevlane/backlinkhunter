import { NextResponse } from 'next/server';

/**
 * Verify the CRON_SECRET header for Vercel cron jobs.
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null; // auth passed
}
