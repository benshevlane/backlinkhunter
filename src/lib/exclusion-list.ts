/**
 * Domains that should always be excluded from prospect discovery and import.
 * These are aggregator sites, social platforms, and marketplaces that
 * don't provide meaningful backlink value.
 */
const EXCLUDED_DOMAINS = new Set([
  'checkatrade.com',
  'bark.com',
  'yell.com',
  'amazon.co.uk',
  'amazon.com',
  'pinterest.com',
  'pinterest.co.uk',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
  'reddit.com',
  'tumblr.com',
  'medium.com',
  'quora.com',
  'wikipedia.org',
  'ebay.co.uk',
  'ebay.com',
  'gumtree.com',
  'trustpilot.com',
  'yelp.com',
  'tripadvisor.com',
  'glassdoor.com',
]);

export function isExcludedDomain(domain: string): boolean {
  const normalised = domain.toLowerCase().replace(/^www\./, '');
  if (EXCLUDED_DOMAINS.has(normalised)) return true;
  // Check if it's a subdomain of an excluded domain
  for (const excluded of EXCLUDED_DOMAINS) {
    if (normalised.endsWith(`.${excluded}`)) return true;
  }
  return false;
}

export function getExcludedDomains(): string[] {
  return Array.from(EXCLUDED_DOMAINS);
}
