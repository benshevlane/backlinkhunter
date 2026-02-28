import { NextResponse } from 'next/server';
import { requireApiAuth, isResponse, parseBody } from '@/src/lib/api-utils';
import { siteAnalysisSchema } from '@/src/lib/validations';
import { analyseSite } from '@/src/lib/site-analysis';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (isResponse(auth)) return auth;

  const body = await parseBody(request, siteAnalysisSchema);
  if (isResponse(body)) return body;

  try {
    const result = await analyseSite(body.site_url);
    return NextResponse.json({ analysis: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Site analysis failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
