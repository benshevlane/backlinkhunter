import type { DiscoverOpportunity, DiscoverRequest, OpportunityType } from '@/src/lib/types';
import { searchGoogleBatch, type SearchResult } from '@/src/lib/integrations/google-search';
import { getDomainMetrics } from '@/src/lib/integrations/dataforseo';
import { checkDomainIsExistingBacklink, checkDomainIsExistingProspect } from '@/src/lib/store';
import { isExcludedDomain } from '@/src/lib/exclusion-list';
import { logger } from '@/src/lib/logger';

const log = logger.create('discovery');

/** Query patterns per opportunity type, as specified in the brief. */
function buildQueries(
  input: DiscoverRequest,
  projectKeywords: string[],
): string[] {
  const keywords = input.seed_keywords?.length ? input.seed_keywords : projectKeywords;
  const queries: string[] = [];

  for (const kw of keywords) {
    for (const type of input.opportunity_types) {
      queries.push(...queriesForType(kw, type, input.seed_url));
    }
  }

  // If a competitor URL was given, add competitor-specific queries using project keywords
  if (input.seed_url) {
    try {
      const host = new URL(input.seed_url).hostname;
      const topKeywords = keywords.slice(0, 3);
      if (topKeywords.length > 0) {
        const kwTerms = topKeywords.map((kw) => `"${kw}"`).join(' OR ');
        queries.push(`site:${host} ${kwTerms}`);
      }
      for (const kw of topKeywords) {
        queries.push(`"${host}" "${kw}"`);
      }
    } catch {
      // invalid URL, skip
    }
  }

  return queries;
}

function queriesForType(keyword: string, type: OpportunityType | string, seedUrl?: string): string[] {
  switch (type) {
    case 'resource_link':
      return [
        `"${keyword}" "useful resources" UK`,
        `"${keyword}" "resources" OR "links" UK`,
      ];
    case 'guest_post':
      return [
        `"${keyword}" "write for us" OR "contribute" UK`,
        `"${keyword}" "guest post" OR "guest article" UK`,
      ];
    case 'broken_link':
      return [
        `"${keyword}" resources UK inurl:resources`,
        `"${keyword}" links UK inurl:links`,
      ];
    case 'link_exchange':
      return [
        `${keyword} directory UK trade association`,
        `${keyword} UK blog inurl:resources`,
      ];
    default:
      return [`"${keyword}" UK`];
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Calculate a linkability score (0–100) from domain metrics.
 * Factors: DR, spam score, referring domains, and whether contact is likely findable.
 */
function calculateLinkabilityScore(metrics: {
  domain_rating: number;
  spam_score: number;
  referring_domains: number;
}): number {
  let score = 50;

  // DR contribution (0-30 points): higher DR is better up to ~60, diminishing above
  const dr = metrics.domain_rating;
  if (dr >= 50) score += 30;
  else if (dr >= 30) score += 20;
  else if (dr >= 15) score += 10;
  else score += 5;

  // Spam penalty (0 to -30 points)
  if (metrics.spam_score > 20) score -= 30;
  else if (metrics.spam_score > 10) score -= 15;
  else if (metrics.spam_score > 5) score -= 5;

  // Referring domains bonus (0-20 points): indicates active link profile
  const rd = metrics.referring_domains;
  if (rd >= 100) score += 20;
  else if (rd >= 30) score += 15;
  else if (rd >= 10) score += 10;
  else score += 5;

  return Math.max(5, Math.min(95, score));
}

/**
 * Calculate a topical relevance score (0–100) based on keyword overlap.
 */
function calculateRelevanceScore(
  title: string,
  snippet: string,
  keywords: string[],
): number {
  const text = `${title} ${snippet}`.toLowerCase();
  if (keywords.length === 0) return 50;

  let matches = 0;
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) matches++;
  }

  const ratio = matches / keywords.length;
  return Math.round(Math.max(10, Math.min(95, ratio * 80 + 20)));
}

/**
 * Run prospect discovery using Google CSE + DataForSEO metrics.
 * Filters out excluded domains, existing backlinks, and existing prospects.
 */
export async function discoverOpportunities(
  input: DiscoverRequest,
  orgId: string,
  projectKeywords: string[] = [],
): Promise<DiscoverOpportunity[]> {
  const limit = Math.min(input.limit ?? 50, 200);
  const keywords = input.seed_keywords?.length ? input.seed_keywords : projectKeywords;

  const queries = buildQueries(input, projectKeywords);
  log.info('Running discovery', { queries: queries.length, limit });

  // Step 1: Run Google searches
  const searchResults = await searchGoogleBatch(
    queries.slice(0, 20), // Cap at 20 queries to respect rate limits
    { country: input.filters.country ?? 'GB' },
  );

  log.info('Search returned results', { count: searchResults.length });

  // Step 2: Filter and enrich each result
  const opportunities: DiscoverOpportunity[] = [];
  const seenDomains = new Set<string>();

  // Also build exclude set from user input
  const userExcludes = new Set(
    (input.filters.exclude_domains ?? []).map((d) => d.toLowerCase()),
  );

  for (const result of searchResults) {
    if (opportunities.length >= limit) break;

    const domain = extractDomain(result.url);
    if (!domain || seenDomains.has(domain)) continue;
    seenDomains.add(domain);

    // Apply filters
    if (isExcludedDomain(domain)) continue;
    if (userExcludes.has(domain)) continue;

    // Check existing backlinks/prospects
    const [isBacklink, isProspect] = await Promise.all([
      checkDomainIsExistingBacklink(input.project_id, orgId, domain),
      checkDomainIsExistingProspect(input.project_id, orgId, domain),
    ]);
    if (isBacklink || isProspect) continue;

    // Fetch domain metrics from DataForSEO
    const metrics = await getDomainMetrics(domain);

    const da = metrics?.domain_rating ?? 0;
    const spamScore = metrics?.spam_score ?? 0;

    // Apply metric filters
    if (spamScore > (input.filters.max_spam_score ?? 30)) continue;
    if (da < (input.filters.min_da ?? 0)) continue;

    const linkabilityScore = metrics
      ? calculateLinkabilityScore(metrics)
      : 50;

    const relevanceScore = calculateRelevanceScore(
      result.title,
      result.snippet,
      keywords,
    );

    // Guess opportunity type from query context
    const opportunityType = guessOpportunityType(result, input.opportunity_types);

    opportunities.push({
      prospect_url: result.url,
      prospect_domain: domain,
      page_title: result.title,
      page_url: result.url,
      snippet: result.snippet,
      opportunity_type: opportunityType,
      linkability_score: linkabilityScore,
      relevance_score: relevanceScore,
    });
  }

  // Sort by linkability score descending
  opportunities.sort((a, b) => b.linkability_score - a.linkability_score);

  log.info('Discovery complete', { total: opportunities.length });
  return opportunities;
}

function guessOpportunityType(
  result: SearchResult,
  requestedTypes: DiscoverRequest['opportunity_types'],
): OpportunityType {
  const text = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();

  if (text.includes('write for us') || text.includes('guest post') || text.includes('contribute')) {
    return 'guest_post';
  }
  if (text.includes('resource') || text.includes('useful links')) {
    return 'resource_link';
  }
  if (text.includes('directory') || text.includes('listing')) {
    return 'link_exchange';
  }
  if (text.includes('broken') || text.includes('404')) {
    return 'broken_link';
  }

  return requestedTypes[0] ?? 'resource_link';
}
