import type { DiscoverRequest, OpportunityType } from '@/src/lib/types';

export interface DiscoveryOpportunity {
  prospect_url: string;
  prospect_domain: string;
  page_title: string;
  page_url: string;
  snippet: string;
  opportunity_type: OpportunityType;
  linkability_score: number;
  relevance_score: number;
}

function makeSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function score(base: number, offset: number) {
  return Math.max(10, Math.min(95, base + offset));
}

export function discoverOpportunities(input: DiscoverRequest): DiscoveryOpportunity[] {
  const keywords = input.seed_keywords && input.seed_keywords.length > 0 ? input.seed_keywords : ['backlinks'];
  const limit = Math.min(input.limit ?? 50, 200);

  const opportunities: DiscoveryOpportunity[] = [];

  for (const keyword of keywords) {
    for (const type of input.opportunity_types) {
      const slug = makeSlug(keyword);
      const typeSlug = type.replace('_', '-');
      const domain = `${slug}-${typeSlug}.example.com`;
      const articleSlug = `${typeSlug}-${slug}-opportunity`;

      opportunities.push({
        prospect_url: `https://${domain}`,
        prospect_domain: domain,
        page_title: `${keyword} ${type.replace('_', ' ')} opportunities`,
        page_url: `https://${domain}/${articleSlug}`,
        snippet: `A candidate ${type.replace('_', ' ')} page related to ${keyword}.`,
        opportunity_type: type,
        linkability_score: score(62, opportunities.length % 21),
        relevance_score: score(70, (opportunities.length * 2) % 19),
      });

      if (opportunities.length >= limit) {
        return opportunities;
      }
    }
  }

  if (opportunities.length === 0 && input.seed_url) {
    const url = new URL(input.seed_url);
    opportunities.push({
      prospect_url: `${url.protocol}//partners.${url.hostname}`,
      prospect_domain: `partners.${url.hostname}`,
      page_title: `Resources linking to ${url.hostname}`,
      page_url: `${url.protocol}//partners.${url.hostname}/resources`,
      snippet: `Generated discovery opportunity from seed URL ${url.hostname}.`,
      opportunity_type: 'resource_link',
      linkability_score: 64,
      relevance_score: 72,
    });
  }

  return opportunities.slice(0, limit);
}
