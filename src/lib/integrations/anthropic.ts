import Anthropic from '@anthropic-ai/sdk';
import type { ProjectRecord, ProspectRecord, SiteAnalysisResult } from '@/src/lib/types';

const MODEL = 'claude-sonnet-4-6';

let client: Anthropic | null = null;

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Analyse a site's HTML content to extract niche, keywords, audience, and themes.
 * Returns a best-effort placeholder when the API is not configured (dev mode).
 */
export async function analyseSiteContent(
  url: string,
  htmlContent: string,
): Promise<SiteAnalysisResult> {
  if (!isConfigured()) {
    console.warn('[Anthropic] Not configured — returning placeholder analysis. Set ANTHROPIC_API_KEY.');
    return {
      niche: 'Unknown',
      description: 'Site analysis unavailable without Anthropic API key.',
      target_keywords: [],
      target_audience: 'Unknown',
      domain_rating: null,
      content_themes: [],
    };
  }

  const truncated = htmlContent.slice(0, 30000);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `You are an SEO analyst. Analyse the provided website content and extract structured information. Respond ONLY with valid JSON matching this schema:
{
  "niche": "string — the site's primary industry/niche",
  "description": "string — 1-2 sentence description of what the site does",
  "target_keywords": ["string array — 5-10 target keywords for backlink outreach"],
  "target_audience": "string — who the site serves",
  "content_themes": ["string array — 3-5 main content themes"]
}`,
    messages: [
      {
        role: 'user',
        content: `Analyse this website (${url}):\n\n${truncated}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(text) as Omit<SiteAnalysisResult, 'domain_rating'>;
    return { ...parsed, domain_rating: null };
  } catch {
    return {
      niche: 'Unknown',
      description: text.slice(0, 200),
      target_keywords: [],
      target_audience: 'Unknown',
      domain_rating: null,
      content_themes: [],
    };
  }
}

/**
 * Generate a personalised outreach email using Claude.
 * Returns a template-based fallback when the API is not configured (dev mode).
 */
export async function generateOutreachEmail(
  prospect: ProspectRecord,
  project: ProjectRecord,
  options: {
    tone: 'professional' | 'friendly' | 'concise';
    custom_value_prop?: string;
    is_followup: boolean;
  },
): Promise<{ subject: string; body_html: string; body_text: string }> {
  if (!isConfigured()) {
    console.warn('[Anthropic] Not configured — returning template email. Set ANTHROPIC_API_KEY.');
    return fallbackEmail(prospect, project, options);
  }

  const toneGuide: Record<string, string> = {
    professional:
      'Use a professional, polished tone suitable for trade bodies and established businesses.',
    friendly:
      'Use a warm, conversational tone suitable for bloggers and small site owners.',
    concise:
      'Be extremely brief and direct. No fluff. Get to the point in 2-3 short paragraphs.',
  };

  const system = `You are an expert outreach email writer for link-building campaigns. Write a personalised email.

Rules:
- Reference the specific page or article on the prospect's site
- Explain the value to THEIR readers (not yours)
- 3-4 short paragraphs maximum
- Clear single call-to-action
- NEVER use "I hope this email finds you well" or similar generic openers
- ${toneGuide[options.tone]}
${options.is_followup ? '- This is a follow-up email. Be brief, reference the original email, and gently re-state the value proposition.' : ''}
${options.custom_value_prop ? `- Value proposition to emphasise: ${options.custom_value_prop}` : ''}

Respond ONLY with valid JSON:
{
  "subject": "string — email subject line",
  "body_text": "string — plain text email body"
}`;

  const userPrompt = `Write an outreach email for this scenario:

My site: ${project.target_url} (${project.niche ?? 'general'})
${project.description ? `About us: ${project.description}` : ''}

Prospect domain: ${prospect.prospect_domain}
Prospect page: ${prospect.page_url ?? prospect.prospect_url}
Page title: ${prospect.page_title ?? 'Unknown'}
Page snippet: ${prospect.snippet ?? 'N/A'}
Opportunity type: ${prospect.opportunity_type ?? 'resource_link'}
${prospect.contact_name ? `Contact name: ${prospect.contact_name}` : ''}
${prospect.contact_role ? `Contact role: ${prospect.contact_role}` : ''}`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(text) as { subject: string; body_text: string };
    return {
      subject: parsed.subject,
      body_text: parsed.body_text,
      body_html: parsed.body_text
        .split('\n\n')
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('\n'),
    };
  } catch {
    return fallbackEmail(prospect, project, options);
  }
}

function fallbackEmail(
  prospect: ProspectRecord,
  project: ProjectRecord,
  options: { is_followup: boolean },
): { subject: string; body_html: string; body_text: string } {
  const name = prospect.contact_name ?? 'there';
  const subject = options.is_followup
    ? `Following up: ${project.name} x ${prospect.prospect_domain}`
    : `Collaboration opportunity: ${project.name} x ${prospect.prospect_domain}`;

  const body = options.is_followup
    ? `Hi ${name},\n\nJust wanted to follow up on my previous email about a potential collaboration between ${project.target_url} and ${prospect.prospect_domain}.\n\nI'd love to hear your thoughts when you get a chance.\n\nBest regards`
    : `Hi ${name},\n\nI came across ${prospect.page_title ?? prospect.prospect_domain} and thought there could be a great fit for collaboration with ${project.name}.\n\nWe focus on ${project.niche ?? 'relevant content'} and I believe our content would add value for your readers.\n\nWould you be open to discussing this further?\n\nBest regards`;

  return {
    subject,
    body_text: body,
    body_html: body
      .split('\n\n')
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join('\n'),
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
