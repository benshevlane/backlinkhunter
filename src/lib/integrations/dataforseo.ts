const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const BASE_URL = 'https://api.dataforseo.com/v3';

export interface DomainMetrics {
  domain_rating: number;
  spam_score: number;
  referring_domains: number;
  monthly_traffic: number;
}

export interface BacklinkEntry {
  linking_domain: string;
  linking_url: string;
  dr: number;
  first_seen: string;
}

function isConfigured(): boolean {
  return Boolean(DATAFORSEO_LOGIN && DATAFORSEO_PASSWORD);
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
}

async function request<T>(path: string, body: unknown, retries = 3): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
    }

    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        lastError = new Error('DataForSEO rate limit exceeded');
        continue;
      }

      if (!res.ok) {
        throw new Error(`DataForSEO API error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === retries) break;
    }
  }

  throw lastError;
}

interface DataForSEOResponse {
  tasks?: Array<{
    result?: Array<Record<string, unknown>>;
  }>;
}

/**
 * Get domain-level metrics (DR, spam score, referring domains, traffic).
 * Returns null values when DataForSEO is not configured (dev mode).
 */
export async function getDomainMetrics(domain: string): Promise<DomainMetrics | null> {
  if (!isConfigured()) {
    console.warn('[DataForSEO] Not configured — returning null metrics. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.');
    return null;
  }

  const res = await request<DataForSEOResponse>('/domain_analytics/technologies/domain_technologies/live', [
    { target: domain, limit: 1 },
  ]);

  // Try the backlinks summary endpoint for more relevant metrics
  const summaryRes = await request<DataForSEOResponse>('/backlinks/summary/live', [
    { target: domain },
  ]);

  const summary = summaryRes?.tasks?.[0]?.result?.[0];

  return {
    domain_rating: (summary?.rank as number) ?? 0,
    spam_score: (summary?.spam_score as number) ?? 0,
    referring_domains: (summary?.referring_domains as number) ?? 0,
    monthly_traffic: (summary?.organic_traffic as number) ?? 0,
  };
}

/**
 * Get existing backlinks pointing to a domain.
 * Returns empty array when DataForSEO is not configured (dev mode).
 */
export async function getBacklinks(domain: string, limit = 1000): Promise<BacklinkEntry[]> {
  if (!isConfigured()) {
    console.warn('[DataForSEO] Not configured — returning empty backlinks. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.');
    return [];
  }

  const res = await request<DataForSEOResponse>('/backlinks/backlinks/live', [
    {
      target: domain,
      limit,
      mode: 'as_is',
      order_by: ['rank,desc'],
    },
  ]);

  const items = (res?.tasks?.[0]?.result?.[0] as Record<string, unknown> | undefined);
  const backlinks = (items?.items as Array<Record<string, unknown>>) ?? [];

  return backlinks.map((b) => ({
    linking_domain: extractDomain((b.url_from as string) ?? ''),
    linking_url: (b.url_from as string) ?? '',
    dr: (b.rank as number) ?? 0,
    first_seen: (b.first_seen as string) ?? new Date().toISOString(),
  }));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
