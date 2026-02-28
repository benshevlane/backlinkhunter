const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const BASE_URL = 'https://www.googleapis.com/customsearch/v1';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

function isConfigured(): boolean {
  return Boolean(GOOGLE_CSE_API_KEY && GOOGLE_CSE_ID);
}

/**
 * Search Google via Custom Search Engine API.
 * Returns empty array when not configured (dev mode).
 *
 * Rate limits: 100 queries/day on free tier, 10 results per query.
 */
export async function searchGoogle(
  query: string,
  options?: { country?: string; num?: number },
): Promise<SearchResult[]> {
  if (!isConfigured()) {
    console.warn('[Google CSE] Not configured — returning empty results. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID.');
    return [];
  }

  const params = new URLSearchParams({
    key: GOOGLE_CSE_API_KEY!,
    cx: GOOGLE_CSE_ID!,
    q: query,
    num: String(Math.min(options?.num ?? 10, 10)),
  });

  if (options?.country) {
    params.set('gl', options.country);
    params.set('cr', `country${options.country.toUpperCase()}`);
  }

  const res = await fetch(`${BASE_URL}?${params.toString()}`);

  if (res.status === 429) {
    console.warn('[Google CSE] Daily quota exceeded.');
    return [];
  }

  if (!res.ok) {
    throw new Error(`Google CSE API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      link?: string;
      title?: string;
      snippet?: string;
    }>;
  };

  return (data.items ?? []).map((item) => ({
    url: item.link ?? '',
    title: item.title ?? '',
    snippet: item.snippet ?? '',
  }));
}

/**
 * Run multiple search queries in sequence and deduplicate results by domain.
 * Useful for discovery runs that generate several query variants.
 */
export async function searchGoogleBatch(
  queries: string[],
  options?: { country?: string },
): Promise<SearchResult[]> {
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const query of queries) {
    const batch = await searchGoogle(query, options);
    for (const result of batch) {
      const domain = extractDomain(result.url);
      if (domain && !seen.has(domain)) {
        seen.add(domain);
        results.push(result);
      }
    }
  }

  return results;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
