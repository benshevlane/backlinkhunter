import type { OutreachGenerateRequest, ProspectRecord } from '@/src/lib/types';

function makeSubject(prospect: ProspectRecord, tone: OutreachGenerateRequest['tone']) {
  const tonePrefix = tone === 'friendly' ? 'Quick idea' : tone === 'concise' ? 'Link suggestion' : 'Partnership idea';
  return `${tonePrefix} for ${prospect.prospect_domain}`;
}

export function generateOutreachDraft(
  prospect: ProspectRecord,
  input: OutreachGenerateRequest,
  project: { target_url: string; niche: string | null },
) {
  const contact = prospect.contact_name ?? 'there';
  const context = prospect.page_title ?? prospect.prospect_domain;

  const bodyText = [
    `Hi ${contact},`,
    '',
    `I enjoyed your ${context} content and thought a practical addition for your readers could be a reference to ${project.target_url}.`,
    input.custom_value_prop
      ? `Value proposition: ${input.custom_value_prop}`
      : `We can provide a concise expert contribution aligned with ${project.niche ?? 'your niche'}.`,
    '',
    input.is_followup
      ? `Following up briefly on my previous note${input.followup_number ? ` (#${input.followup_number})` : ''}.`
      : 'If useful, I can send a draft paragraph and anchor options for quick review.',
    '',
    'Would you be open to that?',
  ].join('\n');

  const bodyHtml = bodyText
    .split('\n\n')
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return {
    subject: makeSubject(prospect, input.tone),
    body_text: bodyText,
    body_html: bodyHtml,
  };
}
