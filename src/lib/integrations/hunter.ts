const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const BASE_URL = 'https://api.hunter.io/v2';

export interface DomainContact {
  name: string;
  email: string;
  role: string;
  confidence: number;
}

/** Roles ordered by preference for outreach. */
const PREFERRED_ROLES = [
  'editor',
  'content manager',
  'content',
  'marketing',
  'founder',
  'owner',
  'ceo',
  'managing director',
  'director',
];

function isConfigured(): boolean {
  return Boolean(HUNTER_API_KEY);
}

/**
 * Find email contacts for a domain using Hunter.io's domain-search endpoint.
 * Returns contacts sorted by role preference and confidence.
 * Returns empty array when not configured (dev mode).
 *
 * Rate limits: 25 req/month on free tier, 500 on starter.
 */
export async function findDomainContacts(domain: string): Promise<DomainContact[]> {
  if (!isConfigured()) {
    console.warn('[Hunter.io] Not configured — returning empty contacts. Set HUNTER_API_KEY.');
    return [];
  }

  const params = new URLSearchParams({
    domain,
    api_key: HUNTER_API_KEY!,
  });

  const res = await fetch(`${BASE_URL}/domain-search?${params.toString()}`);

  if (res.status === 429) {
    console.warn('[Hunter.io] Rate limit exceeded.');
    return [];
  }

  if (!res.ok) {
    throw new Error(`Hunter.io API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    data?: {
      emails?: Array<{
        value?: string;
        first_name?: string;
        last_name?: string;
        position?: string;
        confidence?: number;
      }>;
    };
  };

  const emails = data?.data?.emails ?? [];

  const contacts: DomainContact[] = emails
    .filter((e) => e.value && e.confidence && e.confidence >= 30)
    .map((e) => ({
      name: [e.first_name, e.last_name].filter(Boolean).join(' ') || '',
      email: e.value!,
      role: e.position ?? '',
      confidence: e.confidence!,
    }));

  // Sort by role preference, then by confidence
  contacts.sort((a, b) => {
    const aRoleIdx = roleIndex(a.role);
    const bRoleIdx = roleIndex(b.role);
    if (aRoleIdx !== bRoleIdx) return aRoleIdx - bRoleIdx;
    return b.confidence - a.confidence;
  });

  return contacts;
}

/**
 * Find the single best contact for outreach from a domain.
 * Returns the highest-priority role with the highest confidence, or null.
 */
export async function findBestContact(domain: string): Promise<DomainContact | null> {
  const contacts = await findDomainContacts(domain);
  return contacts[0] ?? null;
}

function roleIndex(role: string): number {
  const lower = role.toLowerCase();
  const idx = PREFERRED_ROLES.findIndex((r) => lower.includes(r));
  return idx === -1 ? PREFERRED_ROLES.length : idx;
}
