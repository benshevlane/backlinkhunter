import type { ProspectRecord, ProspectStatus } from '@/src/lib/types';
import { findBestContact } from '@/src/lib/integrations/hunter';
import { logger } from '@/src/lib/logger';

const log = logger.create('enrichment');

export interface EnrichmentResult {
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_source: string;
  status: ProspectStatus;
}

/**
 * Enrich a prospect with contact details using Hunter.io.
 * Falls back to flagging for manual enrichment when no contact is found.
 */
export async function enrichProspectContact(prospect: ProspectRecord): Promise<EnrichmentResult> {
  log.info('Enriching prospect', { domain: prospect.prospect_domain, id: prospect.id });

  const contact = await findBestContact(prospect.prospect_domain);

  if (!contact) {
    log.info('No contact found', { domain: prospect.prospect_domain });
    return {
      contact_name: null,
      contact_email: null,
      contact_role: null,
      contact_source: 'hunter_no_match',
      status: 'needs_manual_enrichment',
    };
  }

  log.info('Contact found', { domain: prospect.prospect_domain, role: contact.role });

  return {
    contact_name: contact.name || null,
    contact_email: contact.email,
    contact_role: contact.role || null,
    contact_source: 'hunter',
    status: 'enriched',
  };
}
