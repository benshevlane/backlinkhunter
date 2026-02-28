import type { OutreachGenerateRequest, ProjectRecord, ProspectRecord } from '@/src/lib/types';
import { generateOutreachEmail } from '@/src/lib/integrations/anthropic';
import { logger } from '@/src/lib/logger';

const log = logger.create('outreach');

/**
 * Generate a personalised outreach email using Anthropic Claude.
 * Falls back to a template when the API is not configured.
 */
export async function generateOutreachDraft(
  prospect: ProspectRecord,
  input: OutreachGenerateRequest,
  project: ProjectRecord,
): Promise<{ subject: string; body_text: string; body_html: string }> {
  log.info('Generating outreach email', {
    prospect: prospect.prospect_domain,
    tone: input.tone,
    followup: input.is_followup,
  });

  return generateOutreachEmail(prospect, project, {
    tone: input.tone,
    custom_value_prop: input.custom_value_prop,
    is_followup: input.is_followup,
  });
}
