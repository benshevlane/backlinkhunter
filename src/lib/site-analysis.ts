import type { SiteAnalysisResult } from '@/src/lib/types';
import { getDomainMetrics } from '@/src/lib/integrations/dataforseo';
import { analyseSiteContent } from '@/src/lib/integrations/anthropic';

/**
 * Fetch a site's homepage HTML (server-side), extract text, call DataForSEO for
 * domain metrics, and call Anthropic to classify niche/keywords/audience.
 */
export async function analyseSite(siteUrl: string): Promise<SiteAnalysisResult> {
  const url = new URL(siteUrl);
  const domain = url.hostname.replace(/^www\./, '');

  // Fetch HTML and domain metrics in parallel
  const [html, metrics] = await Promise.all([
    fetchHtml(siteUrl),
    getDomainMetrics(domain),
  ]);

  // Use Anthropic to extract structured site info from the HTML
  const analysis = await analyseSiteContent(siteUrl, html);

  return {
    ...analysis,
    domain_rating: metrics?.domain_rating ?? analysis.domain_rating,
  };
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BacklinkHunter/1.0 (site-analysis)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return '';
    }

    const text = await res.text();
    return stripToText(text);
  } catch {
    return '';
  }
}

/**
 * Strip HTML to a condensed text representation keeping title, meta, headings,
 * and paragraph content. This reduces token usage when sent to Claude.
 */
function stripToText(html: string): string {
  const parts: string[] = [];

  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    parts.push(`Title: ${clean(titleMatch[1])}`);
  }

  // Extract meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  if (metaMatch) {
    parts.push(`Meta description: ${clean(metaMatch[1])}`);
  }

  // Extract headings
  const headings = html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
  for (const m of headings) {
    const text = clean(m[1]);
    if (text) parts.push(`Heading: ${text}`);
  }

  // Extract paragraph text
  const paragraphs = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const m of paragraphs) {
    const text = clean(m[1]);
    if (text.length > 20) parts.push(text);
  }

  return parts.join('\n').slice(0, 30_000);
}

function clean(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
