import { NextResponse } from 'next/server';

export function notImplemented(endpoint: string) {
  return NextResponse.json(
    {
      error: 'not_implemented',
      message: `${endpoint} is scaffolded but not implemented yet.`,
    },
    { status: 501 },
  );
}
