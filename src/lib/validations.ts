import { z } from 'zod';

// ---- Shared enums ----

export const opportunityTypeSchema = z.enum([
  'guest_post',
  'resource_link',
  'broken_link',
  'link_exchange',
  'mention',
]);

export const prospectStatusSchema = z.enum([
  'identified',
  'enriched',
  'outreach_drafted',
  'outreach_queued',
  'contacted',
  'followed_up',
  'won',
  'lost',
  'not_relevant',
  'needs_manual_enrichment',
  'verification_error',
]);

export const entryMethodSchema = z.enum(['discovery', 'import', 'manual']);

export const outreachToneSchema = z.enum(['professional', 'friendly', 'concise']);

// ---- Projects ----

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  target_url: z.string().url(),
  niche: z.string().max(200).optional(),
  target_keywords: z.array(z.string().max(100)).max(50).optional(),
  description: z.string().max(500).optional(),
  domain_rating: z.number().min(0).max(100).optional(),
  target_audience: z.string().max(500).optional(),
});

// ---- Prospects ----

export const createProspectSchema = z.object({
  prospect_url: z.string().url(),
  opportunity_type: opportunityTypeSchema.optional(),
  contact_email: z.string().email().optional(),
});

export const updateProspectStatusSchema = z.object({
  status: prospectStatusSchema,
});

export const enrichProspectSchema = z.object({
  prospect_id: z.string().uuid(),
});

// ---- Discovery ----

export const discoverSchema = z.object({
  project_id: z.string().min(1),
  seed_url: z.string().url().optional(),
  seed_keywords: z.array(z.string().max(100)).max(20).optional(),
  opportunity_types: z
    .array(z.enum(['guest_post', 'resource_link', 'broken_link', 'link_exchange']))
    .min(1)
    .max(4),
  filters: z
    .object({
      min_da: z.number().int().min(0).max(100).optional(),
      max_spam_score: z.number().int().min(0).max(100).optional(),
      exclude_domains: z.array(z.string()).max(50).optional(),
      country: z.string().max(10).optional(),
    })
    .optional()
    .default({}),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

// ---- Outreach ----

export const outreachGenerateSchema = z.object({
  prospect_id: z.string().uuid(),
  tone: outreachToneSchema,
  custom_value_prop: z.string().max(1000).optional(),
  is_followup: z.boolean().default(false),
  followup_number: z.union([z.literal(1), z.literal(2)]).optional(),
});

// ---- Site Analysis ----

export const siteAnalysisSchema = z.object({
  site_url: z.string().url(),
});

// ---- Bulk Import ----

export const bulkImportValidateSchema = z.object({
  project_id: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(500),
  thresholds: z
    .object({
      min_da: z.number().int().min(0).max(100).default(10),
      min_relevance: z.number().int().min(0).max(100).default(30),
      max_spam_score: z.number().int().min(0).max(100).default(30),
    })
    .optional()
    .default({ min_da: 10, min_relevance: 30, max_spam_score: 30 }),
});

export const bulkImportConfirmSchema = z.object({
  job_id: z.string().uuid(),
  approved_urls: z.array(z.string().url()).min(1),
});

// ---- Discovery Confirm ----

export const discoverConfirmSchema = z.object({
  job_id: z.string().uuid(),
  selected_urls: z.array(z.string().url()).min(1),
});

// ---- Link Verification ----

export const linkVerifySchema = z.object({
  prospect_id: z.string().uuid(),
});

export const linkMonitorSchema = z.object({
  project_id: z.string().uuid(),
});

// ---- Keyword Alerts ----

export const alertsCheckSchema = z.object({
  project_id: z.string().uuid().optional(),
});

export const createKeywordAlertSchema = z.object({
  project_id: z.string().uuid(),
  keyword: z.string().min(1).max(200),
});

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(200),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  full_name: z.string().min(1).max(200),
  org_name: z.string().min(1).max(200),
});
