import type { ProspectRecord } from '@/src/lib/types';

const roles = ['editor', 'content manager', 'founder', 'marketing lead'] as const;

function titleCase(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function enrichProspectContact(prospect: ProspectRecord) {
  const domainToken = prospect.prospect_domain.split('.')[0] ?? 'team';
  const name = `${titleCase(domainToken)} Team`;
  const role = roles[domainToken.length % roles.length];

  if (prospect.prospect_domain.includes('noemail')) {
    return {
      contact_name: null,
      contact_email: null,
      contact_role: null,
      contact_source: 'simulated_no_match',
      status: 'needs_manual_enrichment' as const,
    };
  }

  return {
    contact_name: name,
    contact_email: `hello@${prospect.prospect_domain}`,
    contact_role: role,
    contact_source: 'simulated_hunter',
    status: prospect.status,
  };
}
