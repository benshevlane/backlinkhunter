import type { ProspectRecord } from '@/src/lib/types';

export interface VerificationResult {
  prospect_id: string;
  link_live: boolean;
  link_url: string | null;
  verified_at: string;
  lost_at: string | null;
  error?: string;
}

/**
 * Verify whether a prospect's backlink to our target URL is still live.
 * Fetches the prospect's page and checks if it contains a link to our domain.
 */
export async function verifyProspectLink(
  prospect: ProspectRecord,
  targetUrl: string,
): Promise<VerificationResult> {
  const now = new Date().toISOString();
  const targetDomain = extractDomain(targetUrl);

  // Need a page URL to verify against
  const checkUrl = prospect.link_url ?? prospect.page_url ?? prospect.prospect_url;

  try {
    const response = await fetch(checkUrl, {
      headers: { 'User-Agent': 'BacklinkHunter-LinkVerifier/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        prospect_id: prospect.id,
        link_live: false,
        link_url: prospect.link_url,
        verified_at: now,
        lost_at: prospect.link_live ? now : prospect.link_lost_at,
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const found = checkForBacklink(html, targetDomain, targetUrl);

    return {
      prospect_id: prospect.id,
      link_live: found,
      link_url: found ? (prospect.link_url ?? checkUrl) : prospect.link_url,
      verified_at: now,
      lost_at: found ? null : (prospect.link_live ? now : prospect.link_lost_at),
    };
  } catch (err) {
    return {
      prospect_id: prospect.id,
      link_live: false,
      link_url: prospect.link_url,
      verified_at: now,
      lost_at: prospect.link_live ? now : prospect.link_lost_at,
      error: err instanceof Error ? err.message : 'Unknown fetch error',
    };
  }
}

/**
 * Check HTML content for a link pointing to our target domain/URL.
 * Looks for href attributes containing the target domain.
 */
function checkForBacklink(html: string, targetDomain: string, targetUrl: string): boolean {
  const lower = html.toLowerCase();

  // Check for exact URL match first
  if (lower.includes(`href="${targetUrl.toLowerCase()}`)) return true;
  if (lower.includes(`href='${targetUrl.toLowerCase()}`)) return true;

  // Check for domain match in href attributes
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    try {
      const hrefDomain = extractDomain(href);
      if (hrefDomain === targetDomain) return true;
    } catch {
      // Not a valid URL, skip
    }
  }

  return false;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
