import type Anthropic from '@anthropic-ai/sdk';

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'analyse_site',
    description:
      'Crawl the project website, extract niche, keywords, content themes, and fetch Domain Rating. Call this first if no project profile exists yet.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'check_existing_backlinks',
    description:
      'Fetch the current backlink profile for the project from DataForSEO. Returns domains already linking to us so we don\'t waste time targeting them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'run_discovery',
    description:
      'Search for backlink prospects using keywords or a competitor URL. Returns a scored list of candidates for user review — does NOT save anything to the database yet.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        competitor_url: { type: 'string' },
        opportunity_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'resource_page',
              'guest_post',
              'directory_listing',
              'competitor_mention',
              'broken_link',
            ],
          },
        },
        limit: { type: 'number' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'import_prospects',
    description:
      'Save a user-approved list of prospects to the database. Only call this AFTER showing the user the discovery results and receiving explicit approval. Triggers contact enrichment in background.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        job_id: { type: 'string' },
        selected_prospect_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['project_id', 'job_id', 'selected_prospect_ids'],
    },
  },
  {
    name: 'validate_import',
    description:
      'Run quality validation on a list of URLs provided by the user (from CSV or paste). Checks for duplicates, spam score, DA, and relevance. Returns pass/review/fail breakdown — does NOT save anything yet.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        urls: { type: 'array', items: { type: 'string' } },
      },
      required: ['project_id', 'urls'],
    },
  },
  {
    name: 'confirm_import',
    description:
      'Save validated and user-approved URLs as prospect records. Only call after user has reviewed the validate_import results and confirmed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        urls: { type: 'array', items: { type: 'string' } },
      },
      required: ['project_id', 'urls'],
    },
  },
  {
    name: 'enrich_contacts',
    description:
      'Run Hunter.io contact lookup for a list of prospects. Finds name, email, and role for each prospect domain.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['prospect_ids'],
    },
  },
  {
    name: 'generate_outreach_email',
    description:
      'Use Claude to draft a personalised outreach email for a single prospect. Saves as draft — never sends automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_id: { type: 'string' },
        tone: { type: 'string', enum: ['professional', 'friendly', 'concise'] },
        is_followup: { type: 'boolean' },
        followup_number: { type: 'number' },
        custom_value_prop: { type: 'string' },
      },
      required: ['prospect_id'],
    },
  },
  {
    name: 'generate_bulk_emails',
    description:
      'Draft outreach emails for multiple prospects at once. Only call after user approval. Saves all as drafts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_ids: { type: 'array', items: { type: 'string' } },
        tone: { type: 'string', enum: ['professional', 'friendly', 'concise'] },
        is_followup: { type: 'boolean' },
      },
      required: ['prospect_ids'],
    },
  },
  {
    name: 'get_pipeline_summary',
    description:
      'Get a count of prospects at each Kanban stage plus reply rate and win rate for the project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_prospects_needing_attention',
    description:
      'Return prospects that need action: no contact found, stale (>14 days with no activity), follow-ups due, or won links that have gone dead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_prospect_status',
    description: 'Move a prospect to a new pipeline stage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_id: { type: 'string' },
        status: {
          type: 'string',
          enum: [
            'identified',
            'enriched',
            'outreach_drafted',
            'contacted',
            'followed_up',
            'won',
            'lost',
          ],
        },
        notes: { type: 'string' },
      },
      required: ['prospect_id', 'status'],
    },
  },
  {
    name: 'check_link_live',
    description:
      'Check whether a won link is still live — fetches the page and looks for a link pointing to our site.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_id: { type: 'string' },
      },
      required: ['prospect_id'],
    },
  },
];
