import type { BulkImportValidationResult, ValidationBucket } from '@/src/lib/types';
import { getDomainMetrics } from '@/src/lib/integrations/dataforseo';
import { checkDomainIsExistingBacklink, checkDomainIsExistingProspect } from '@/src/lib/store';
import { isExcludedDomain } from '@/src/lib/exclusion-list';
import { logger } from '@/src/lib/logger';

const log = logger.create('import-validation');

interface Thresholds {
  min_da: number;
  min_relevance: number;
  max_spam_score: number;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Validate a list of URLs for bulk import.
 * Runs each URL through the validation pipeline and assigns Pass/Review/Fail buckets.
 */
export async function validateImportUrls(
  urls: string[],
  projectId: string,
  orgId: string,
  thresholds: Thresholds,
): Promise<BulkImportValidationResult[]> {
  log.info('Validating import URLs', { count: urls.length, thresholds });

  const results: BulkImportValidationResult[] = [];

  for (const url of urls) {
    const domain = extractDomain(url);

    if (!domain) {
      results.push({
        url,
        domain: '',
        bucket: 'fail',
        reason: 'Invalid URL',
        domain_authority: null,
        spam_score: null,
        relevance_score: null,
        is_existing_backlink: false,
        is_existing_prospect: false,
      });
      continue;
    }

    // 1. Exclusion list check
    if (isExcludedDomain(domain)) {
      results.push({
        url, domain, bucket: 'fail', reason: 'Excluded domain',
        domain_authority: null, spam_score: null, relevance_score: null,
        is_existing_backlink: false, is_existing_prospect: false,
      });
      continue;
    }

    // 2. Duplicate checks
    const [isBacklink, isProspect] = await Promise.all([
      checkDomainIsExistingBacklink(projectId, orgId, domain),
      checkDomainIsExistingProspect(projectId, orgId, domain),
    ]);

    if (isBacklink) {
      results.push({
        url, domain, bucket: 'fail', reason: 'Already an existing backlink',
        domain_authority: null, spam_score: null, relevance_score: null,
        is_existing_backlink: true, is_existing_prospect: false,
      });
      continue;
    }

    if (isProspect) {
      results.push({
        url, domain, bucket: 'fail', reason: 'Already a prospect',
        domain_authority: null, spam_score: null, relevance_score: null,
        is_existing_backlink: false, is_existing_prospect: true,
      });
      continue;
    }

    // 3. Fetch metrics
    const metrics = await getDomainMetrics(domain);
    const da = metrics?.domain_rating ?? 0;
    const spamScore = metrics?.spam_score ?? 0;

    // 4. Spam score check
    if (spamScore > thresholds.max_spam_score) {
      results.push({
        url, domain, bucket: 'fail', reason: `Spam score ${spamScore} exceeds threshold ${thresholds.max_spam_score}`,
        domain_authority: da, spam_score: spamScore, relevance_score: null,
        is_existing_backlink: false, is_existing_prospect: false,
      });
      continue;
    }

    // 5. Determine bucket
    let bucket: ValidationBucket = 'pass';
    let reason: string | undefined;

    if (da < thresholds.min_da) {
      bucket = 'review';
      reason = `DA ${da} below threshold ${thresholds.min_da}`;
    }

    // Simple relevance: null for now (would need page content fetch + NLP)
    const relevanceScore: number | null = null;

    results.push({
      url, domain, bucket, reason,
      domain_authority: da,
      spam_score: spamScore,
      relevance_score: relevanceScore,
      is_existing_backlink: false,
      is_existing_prospect: false,
    });
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.bucket === 'pass').length,
    review: results.filter((r) => r.bucket === 'review').length,
    failed: results.filter((r) => r.bucket === 'fail').length,
  };

  log.info('Validation complete', summary);
  return results;
}
