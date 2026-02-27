import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { createServerSupabase } from '@/src/lib/supabase/server';

export function notImplemented(endpoint: string) {
  return NextResponse.json(
    { error: 'not_implemented', message: `${endpoint} is scaffolded but not implemented yet.` },
    { status: 501 },
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T | NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('invalid JSON body');
  }

  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 },
      );
    }
    return badRequest('invalid request body');
  }
}

export async function requireApiAuth(): Promise<{ userId: string; orgId: string } | NextResponse> {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership) {
    return unauthorized();
  }

  return { userId: user.id, orgId: membership.org_id };
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
