# Backlink Hunter — Implementation Plan v2

**Date:** 2026-02-28
**Based on:** System Brief v2 (6-Step Flow with Discovery + Import dual entry points)
**Current state:** Working Next.js 14 scaffold with Supabase auth, mock business logic, 8 working API routes, 11 working dashboard pages, 7 stubbed API routes.

---

## What Already Works

Before listing what needs building, here's what we can keep:

| Layer | What exists | Reusable? |
|-------|------------|-----------|
| **Auth** | Supabase auth + org-scoped queries (`auth.ts`, `api-utils.ts`) | Yes, fully |
| **Database** | 11 tables with RLS policies, indexes, triggers | Yes, needs migration additions |
| **Data layer** | Full CRUD in `store.ts` (projects, prospects, outreach_emails) | Yes, needs new functions |
| **API routing** | 15 route files (8 working, 7 stubbed) | Yes, stubs get replaced |
| **Validation** | Zod schemas for all current request types (`validations.ts`) | Yes, needs new schemas |
| **Types** | Full interfaces for all DB tables + request/response types (`types.ts`) | Yes, needs additions |
| **UI shell** | Dashboard layout, sidebar, 11 working pages | Yes, mostly |
| **ProspectsBoard** | 9-column Kanban with status moves, enrich, draft buttons | Yes, needs column changes |
| **DiscoveryForm** | Form + results table | Partial — needs review-then-select UI |
| **OutreachWorkspace** | Prospect selector, tone picker, draft queue | Yes, needs AI integration |
| **CreateProjectForm** | Name + URL form | Partial — needs niche/keywords/analysis step |

---

## Phase 1 — Schema & Type Updates

**Goal:** Get the database and type system aligned with the new spec before writing features.

### 1.1 New migration: `202602280001_v2_schema_additions.sql`

**New tables:**

```sql
-- existing_backlinks: domains we already have links from (Step 2)
create table if not exists public.existing_backlinks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  linking_domain text not null,
  linking_url text,
  dr integer,
  first_seen timestamptz,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create index idx_existing_backlinks_project on existing_backlinks(project_id);
create index idx_existing_backlinks_domain on existing_backlinks(project_id, linking_domain);

-- import_jobs: tracks discovery runs and CSV imports (Step 3)
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  entry_method text not null check (entry_method in ('discovery', 'import')),
  total_submitted integer not null default 0,
  total_passed integer not null default 0,
  total_review integer not null default 0,
  total_failed integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  input_payload jsonb,
  results_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_import_jobs_project on import_jobs(project_id);
```

**Alter existing tables:**

```sql
-- projects: add description, domain_rating, target_audience for site analysis
alter table public.projects
  add column if not exists description text,
  add column if not exists domain_rating integer,
  add column if not exists target_audience text;

-- prospects: add entry_method to track how prospect entered pipeline
alter table public.prospects
  add column if not exists entry_method text check (entry_method in ('discovery', 'import', 'manual'));

-- prospects: update status check constraint to match new spec statuses
-- New statuses: identified, enriched, outreach_drafted, contacted, won, lost, not_relevant, needs_manual_enrichment
alter table public.prospects drop constraint if exists prospects_status_check;
alter table public.prospects add constraint prospects_status_check check (
  status in (
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
    'verification_error'
  )
);

-- Add composite index for Kanban + dedup queries
create index if not exists idx_prospects_project_status on prospects(project_id, status);
create index if not exists idx_prospects_domain on prospects(project_id, prospect_domain);
```

**RLS policies for new tables:**

```sql
alter table public.existing_backlinks enable row level security;
alter table public.import_jobs enable row level security;

-- existing_backlinks: org-scoped
create policy "org members can manage existing_backlinks"
  on public.existing_backlinks for all
  using (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));

-- import_jobs: org-scoped
create policy "org members can manage import_jobs"
  on public.import_jobs for all
  using (org_id in (select org_id from public.organisation_members where user_id = auth.uid()));
```

### 1.2 Type updates (`src/lib/types.ts`)

Add/modify:

```typescript
// New prospect statuses to include enriched and outreach_drafted
export type ProspectStatus =
  | 'identified'
  | 'enriched'
  | 'outreach_drafted'
  | 'outreach_queued'
  | 'contacted'
  | 'followed_up'
  | 'won'
  | 'lost'
  | 'not_relevant'
  | 'needs_manual_enrichment'
  | 'verification_error';

export type EntryMethod = 'discovery' | 'import' | 'manual';

// Add to ProjectRecord:
//   description: string | null;
//   domain_rating: number | null;
//   target_audience: string | null;

// Add to ProspectRecord:
//   entry_method: EntryMethod | null;

// New interfaces:
export interface ExistingBacklinkRecord { ... }
export interface ImportJobRecord { ... }

// New request/response types for import flow:
export interface BulkImportRequest {
  project_id: string;
  urls: string[];              // for URL paste
  csv_data?: string;           // raw CSV content
  thresholds: {
    min_da: number;            // default 10
    min_relevance: number;     // default 30
    max_spam_score: number;    // default 30
  };
}

export interface BulkImportValidationResult {
  url: string;
  domain: string;
  bucket: 'pass' | 'review' | 'fail';
  reason?: string;             // why it failed or flagged
  domain_authority: number | null;
  spam_score: number | null;
  relevance_score: number | null;
  is_existing_backlink: boolean;
  is_existing_prospect: boolean;
}

export interface BulkImportResponse {
  job_id: string;
  results: BulkImportValidationResult[];
  summary: {
    total: number;
    passed: number;
    review: number;
    failed: number;
  };
}

// Site analysis types for Step 1:
export interface SiteAnalysisResult {
  niche: string;
  description: string;
  target_keywords: string[];
  target_audience: string;
  domain_rating: number | null;
  content_themes: string[];
}
```

### 1.3 New validation schemas (`src/lib/validations.ts`)

```typescript
export const bulkImportSchema = z.object({
  project_id: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(500),
  thresholds: z.object({
    min_da: z.number().int().min(0).max(100).default(10),
    min_relevance: z.number().int().min(0).max(100).default(30),
    max_spam_score: z.number().int().min(0).max(100).default(30),
  }).optional().default({ min_da: 10, min_relevance: 30, max_spam_score: 30 }),
});

export const bulkImportConfirmSchema = z.object({
  job_id: z.string().uuid(),
  approved_urls: z.array(z.string().url()).min(1),
});

export const siteAnalysisSchema = z.object({
  project_id: z.string().uuid(),
  site_url: z.string().url(),
});
```

### 1.4 New store functions (`src/lib/store.ts`)

```typescript
// existing_backlinks CRUD
createExistingBacklink(projectId, orgId, input)
listExistingBacklinksForProject(projectId, orgId)
checkDomainIsExistingBacklink(projectId, orgId, domain) -> boolean

// import_jobs CRUD
createImportJob(projectId, orgId, input)
getImportJobById(jobId, orgId)
updateImportJob(jobId, orgId, patch)

// prospect dedup check
checkDomainIsExistingProspect(projectId, orgId, domain) -> boolean

// bulk prospect creation
createProspectsBulk(projectId, orgId, prospects[]) -> ProspectRecord[]
```

---

## Phase 2 — External API Integrations

**Goal:** Create thin client wrappers for each external service. Each wrapper lives in its own file, handles auth/retries/error mapping, and exposes a clean typed interface.

### 2.1 DataForSEO client (`src/lib/integrations/dataforseo.ts`)

Used in: Steps 1, 2, 3, 4

```typescript
// Functions needed:
getDomainMetrics(domain: string) -> { domain_rating: number, spam_score: number, referring_domains: number, monthly_traffic: number }
getBacklinks(domain: string, limit?: number) -> { linking_domain: string, linking_url: string, dr: number, first_seen: string }[]
```

- Auth: HTTP Basic with login/password from env vars `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
- Endpoint: `https://api.dataforseo.com/v3/`
- Rate limits: respect their 2000 req/min limit, add basic retry with backoff
- Fallback: if DataForSEO is not configured (no env vars), return null values and log a warning — this lets the app work in dev without API keys

### 2.2 Google Custom Search client (`src/lib/integrations/google-search.ts`)

Used in: Step 3A (Discovery)

```typescript
searchGoogle(query: string, options?: { country?: string, num?: number }) -> { url: string, title: string, snippet: string }[]
```

- Auth: API key from `GOOGLE_CSE_API_KEY`, search engine ID from `GOOGLE_CSE_ID`
- Rate limits: 100 queries/day on free tier, 10 results per query
- For each discovery run, generate multiple search variants from keywords + opportunity types and batch the queries

### 2.3 Hunter.io client (`src/lib/integrations/hunter.ts`)

Used in: Step 5

```typescript
findDomainContacts(domain: string) -> { name: string, email: string, role: string, confidence: number }[]
```

- Auth: API key from `HUNTER_API_KEY`
- Rate limits: 25 req/month on free tier, 500 on starter
- Prioritise roles: editor > content manager > founder > owner > marketing
- Return the highest-confidence contact matching preferred roles

### 2.4 Anthropic Claude client (`src/lib/integrations/anthropic.ts`)

Used in: Steps 1, 6

```typescript
// For site analysis (Step 1):
analyseSiteContent(url: string, htmlContent: string) -> SiteAnalysisResult

// For outreach email generation (Step 6):
generateOutreachEmail(prospect: ProspectRecord, project: ProjectRecord, options: { tone, custom_value_prop?, is_followup }) -> { subject: string, body_html: string, body_text: string }
```

- Auth: API key from `ANTHROPIC_API_KEY`
- Model: `claude-sonnet-4-6` (as specified in the brief)
- For outreach: system prompt encodes the rules (no generic phrases, tone matching, 3-4 paragraphs, clear CTA)
- For site analysis: pass the page HTML/text content and ask Claude to extract niche, keywords, audience, themes

### 2.5 Environment variables (`.env.example` update)

```
# DataForSEO
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# Google Custom Search
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_ID=

# Hunter.io
HUNTER_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=
```

### 2.6 New npm dependencies

```
@anthropic-ai/sdk    — Anthropic Claude API client
```

No SDK needed for DataForSEO, Google CSE, or Hunter.io — they're simple REST APIs, use `fetch` directly.

---

## Phase 3 — Step 1: Site Analysis & Project Setup

**Goal:** Replace the current basic project creation form with an analysis-driven flow.

### What changes

| Current | New |
|---------|-----|
| `CreateProjectForm` — just name + URL | Wizard: enter URL → system crawls & analyses → shows extracted niche/keywords/audience → user confirms/edits → project created |
| `projects/new/page.tsx` — placeholder | Full onboarding wizard page |
| `POST /api/projects` — creates with manual fields | Also triggers site analysis and stores results |

### 3.1 New: Site analysis logic (`src/lib/site-analysis.ts`)

```typescript
export async function analyseSite(url: string): Promise<SiteAnalysisResult>
```

1. Fetch the site's homepage HTML (server-side `fetch`)
2. Extract text content (strip HTML tags, get meta description, title, headings)
3. Call DataForSEO `getDomainMetrics` for domain_rating
4. Call Anthropic Claude to analyse the text and extract: niche, description, keywords, target_audience, content_themes
5. Return combined result

### 3.2 New API route: `POST /api/projects/analyse`

- Accepts `{ site_url: string }`
- Runs `analyseSite()`
- Returns the analysis result for the user to review before creating the project
- Does NOT create the project — that's a separate step after user confirms

### 3.3 Update: `POST /api/projects`

- Accept new optional fields: `description`, `domain_rating`, `target_audience`
- These come pre-filled from the analysis step

### 3.4 New component: `ProjectWizard` (replaces `CreateProjectForm`)

Step-by-step flow:
1. Enter site URL → click "Analyse"
2. Loading state while analysis runs
3. Show results: niche, description, keywords, audience, DR
4. User can edit any field
5. Enter project name
6. Click "Create Project" → calls `POST /api/projects` with all fields
7. Redirect to project overview

### 3.5 Update: `projects/new/page.tsx`

Replace `PagePlaceholder` with the `ProjectWizard` component.

---

## Phase 4 — Step 2: Existing Backlink Profile

**Goal:** Fetch and store current backlinks so we can dedup during discovery and import.

### 4.1 New: Backlink fetch logic (`src/lib/backlink-profile.ts`)

```typescript
export async function fetchBacklinkProfile(projectId: string, orgId: string, domain: string): Promise<void>
```

1. Call DataForSEO `getBacklinks(domain)` to get all referring domains
2. For each backlink, upsert into `existing_backlinks` table (update `last_seen` if already exists)
3. Update import_job status as it processes

### 4.2 New API route: `POST /api/projects/[id]/backlinks/sync`

- Triggers the backlink profile fetch for a project
- Returns immediately with job_id, processing happens in background (or synchronously if small)

### 4.3 Update: Project overview page

- Show "Existing backlinks" count on project dashboard
- Add a "Sync backlinks" button that triggers the fetch
- Show last sync time

---

## Phase 5 — Step 3A: Discovery (The Core Feature)

**Goal:** Replace the mock discovery with real Google search + DataForSEO scoring + review-then-select UI.

### What changes

| Current | New |
|---------|-----|
| `discovery.ts` — generates fake `example.com` domains | Real Google Custom Search queries + DataForSEO metric lookups |
| `DiscoveryForm` — dumps all results to a table | Review table with checkboxes, sorting, filtering, "Add selected" button |
| `POST /api/discover` — returns mock data | Returns real scored results, creates import_job |

### 5.1 Replace: Discovery logic (`src/lib/discovery.ts`)

```typescript
export async function discoverOpportunities(input: DiscoverRequest): Promise<DiscoverOpportunity[]>
```

New implementation:
1. Generate search queries from seed keywords + opportunity types using the query templates from the spec:
   - Resource: `"{keyword}" "useful resources" UK`
   - Guest post: `"{keyword}" "write for us" OR "contribute" UK`
   - Directory: `{keyword} directory UK trade association`
   - Mention: `site:{competitor} "{keyword}" -{our_domain}`
2. Execute queries via Google Custom Search client
3. Deduplicate results by domain
4. For each unique domain, fetch metrics from DataForSEO (`domain_rating`, `spam_score`)
5. Filter out: existing backlinks, existing prospects, excluded domains (Checkatrade, Bark, Yell, Amazon, Pinterest, social media), spam_score > `filters.max_spam_score`
6. Calculate `linkability_score` and `relevance_score` (see Phase 6)
7. Sort by `linkability_score` descending
8. Return scored results

### 5.2 New: Exclusion list (`src/lib/exclusions.ts`)

```typescript
export const EXCLUDED_DOMAINS = [
  'checkatrade.com', 'bark.com', 'yell.com',
  'amazon.co.uk', 'amazon.com', 'pinterest.com',
  'facebook.com', 'twitter.com', 'instagram.com',
  'linkedin.com', 'tiktok.com', 'youtube.com',
  'reddit.com',
];

export function isDomainExcluded(domain: string): boolean
```

### 5.3 Update: `POST /api/discover`

- Keep the same Zod schema and auth
- Replace `discoverOpportunities()` call (it now does real work)
- Create an `import_job` record with `entry_method = 'discovery'`
- Return results + job_id (results are NOT saved as prospects yet — user must select)

### 5.4 New API route: `POST /api/discover/confirm`

- Accepts `{ job_id, selected_urls: string[] }`
- Creates prospect records for each selected URL with `status = 'identified'`, `entry_method = 'discovery'`
- Queues contact enrichment for each new prospect
- Returns created prospect IDs

### 5.5 Replace: `DiscoveryForm` component

New component: `DiscoveryWorkflow`

**Stage 1 — Input:**
- Project selector (dropdown of user's projects)
- Input mode toggle: "Keywords" or "Competitor URL"
- Keywords: comma-separated text input
- Competitor URL: single URL input
- Opportunity type checkboxes (resource page, guest post, directory, mention, broken link)
- Filter controls: min DA, max spam score, country
- "Discover" button

**Stage 2 — Review results:**
- Table with columns: Checkbox, Domain, Page Title, Type, DA, Linkability, Relevance, Preview link
- Sortable by any column
- Filterable by score ranges
- "Select all passing" button, individual checkboxes per row
- Count of selected vs total
- "Add X prospects to pipeline" button

**Stage 3 — Confirmation:**
- Calls `POST /api/discover/confirm` with selected URLs
- Shows summary: "Added 12 prospects. Enrichment queued."
- Link to Kanban pipeline

### 5.6 Update: `discover/page.tsx`

Replace `DiscoveryForm` with `DiscoveryWorkflow` component.

---

## Phase 6 — Step 4: Scoring Logic

**Goal:** Replace hardcoded scores with a real weighted formula.

### 6.1 New: Scoring module (`src/lib/scoring.ts`)

```typescript
export function calculateLinkabilityScore(metrics: {
  domain_rating: number | null;
  topical_relevance: number;     // 0-100 from content analysis
  outbound_link_frequency: number | null;  // from DataForSEO
  content_recency: number | null; // days since last publish
  has_contact: boolean;
  links_to_similar: boolean;
}): number  // 0-100

export function calculateRelevanceScore(
  pageContent: string,
  projectKeywords: string[],
  projectNiche: string
): number  // 0-100
```

**Linkability formula (weighted):**

| Factor | Weight | Scoring |
|--------|--------|---------|
| Domain Rating | 25% | DR 0-100 mapped to 0-100 (with diminishing returns above DR 70) |
| Topical relevance | 30% | Direct from relevance score |
| Outbound link frequency | 15% | Sites with 10+ outbound links per page score high |
| Content recency | 15% | Published in last 6 months = 100, last year = 60, older = 30 |
| Contact findable | 10% | Yes = 100, No = 20 |
| Links to similar sites | 5% | Yes = 100, No = 0 |

**Relevance scoring:**
- Keyword overlap: count how many project keywords appear in the page content
- Niche matching: check for niche-related terms (for kitchens: "kitchen", "bespoke", "handmade", "interiors", "renovation", "home improvement")
- Return percentage score

### 6.2 Integration points

- Called from `discovery.ts` during Step 3A
- Called from `bulk-import` validation during Step 3B
- Can be called on demand to re-score existing prospects

---

## Phase 7 — Step 3B: Import Flow

**Goal:** Build the CSV upload + URL paste flow with validation pipeline and 3-bucket review.

### 7.1 New: Import validation logic (`src/lib/import-validation.ts`)

```typescript
export async function validateImportUrls(
  projectId: string,
  orgId: string,
  urls: string[],
  thresholds: { min_da: number; min_relevance: number; max_spam_score: number }
): Promise<BulkImportValidationResult[]>
```

For each URL:
1. Normalise URL (strip trailing slash, extract root domain)
2. Check `existing_backlinks` table → auto-fail if found
3. Check `prospects` table → auto-fail if duplicate
4. Check exclusion list → auto-fail if excluded
5. Fetch DA and spam score from DataForSEO
6. Fetch page content, run relevance scoring against project niche/keywords
7. Classify into bucket:
   - **Pass**: DA >= threshold AND spam_score <= threshold AND relevance >= threshold AND not duplicate AND not excluded
   - **Fail**: duplicate, excluded, spam > 30
   - **Review**: borderline on one metric (e.g. DA low but relevance high)

### 7.2 New: CSV parser (`src/lib/csv-parser.ts`)

```typescript
export function parseCsvToUrls(csvContent: string): { urls: string[], errors: string[] }
```

- Detect the `url` column (case-insensitive, also check for `URL`, `website`, `domain`)
- Extract URLs from that column
- Strip whitespace, normalise
- Return list + any parse errors

### 7.3 Replace: `POST /api/prospects/bulk-import` (currently 501 stub)

Two-phase API:

**Phase A — Validate:** `POST /api/prospects/bulk-import/validate`
- Accepts: `{ project_id, urls[], thresholds }`
- Runs validation pipeline
- Creates `import_job` record with `status = 'running'`
- Returns: job_id + validation results (pass/review/fail buckets)

**Phase B — Confirm:** `POST /api/prospects/bulk-import/confirm`
- Accepts: `{ job_id, approved_urls[] }`
- Creates prospect records for approved URLs
- Queues enrichment
- Updates import_job with final counts
- Returns: summary

### 7.4 New component: `ImportWorkflow`

**Layout:** Two tabs — "Paste URLs" and "Upload CSV"

**Paste URLs tab:**
- Textarea, one URL per line
- "Validate" button

**Upload CSV tab:**
- File upload area (drag and drop or click to browse)
- "Download template" link → serves a simple CSV with `url,site_name,notes,opportunity_type` headers
- Preview of parsed URLs before validation

**After validation — Review screen:**
- Three collapsible sections:
  - Pass (green) — checked by default, shows count
  - Review (amber) — unchecked by default, shows reason per row, user toggles each
  - Fail (red) — greyed out, shows reason, not selectable
- Threshold sliders: min DA, min relevance, max spam score
- "Re-validate" button (re-runs with new thresholds, no re-upload needed)
- "Import X prospects" button

**After confirmation:**
- Summary: "Imported 42 prospects. Skipped 8 (3 duplicates, 2 spam, 3 low relevance)."
- Link to Kanban

### 7.5 Replace: `projects/[id]/prospects/import/page.tsx`

Replace `PagePlaceholder` with the `ImportWorkflow` component.

---

## Phase 8 — Step 5: Contact Enrichment (Hunter.io)

**Goal:** Replace simulated enrichment with real Hunter.io API calls.

### 8.1 Replace: `src/lib/enrichment.ts`

```typescript
export async function enrichProspectContact(prospect: ProspectRecord): Promise<{
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_source: string;
  status: ProspectStatus;
}>
```

New implementation:
1. Call Hunter.io `findDomainContacts(prospect.prospect_domain)`
2. Filter by preferred roles: editor, content manager, founder, owner
3. Pick highest-confidence match
4. If found: return contact details, `status = 'enriched'`, `contact_source = 'hunter.io'`
5. If not found: return nulls, `status = 'needs_manual_enrichment'`

### 8.2 Update: `POST /api/prospects/enrich`

- Replace the mock enrichment call with the real one
- Update the prospect record in DB with contact details and new status
- No other changes needed — the API contract stays the same

### 8.3 Background enrichment trigger

After discovery confirm or import confirm, kick off enrichment for each new prospect. Options:

**Option A (Simple, MVP):** Run enrichment sequentially after prospect creation in the confirm endpoints. Slower but no infrastructure needed.

**Option B (Better UX):** Return immediately from confirm, run enrichment via a separate `POST /api/prospects/enrich-batch` endpoint that the client polls. Prospects show "Enriching..." in the Kanban until done.

**Recommendation:** Start with Option A. Move to Option B when dealing with imports of 50+ URLs where the wait becomes noticeable.

---

## Phase 9 — Step 6: AI Outreach (Anthropic Claude)

**Goal:** Replace template-based email generation with Claude-powered personalised drafts.

### 9.1 Replace: `src/lib/outreach.ts`

```typescript
export async function generateOutreachDraft(
  prospect: ProspectRecord,
  input: OutreachGenerateRequest,
  project: ProjectRecord,
): Promise<{ subject: string; body_html: string; body_text: string }>
```

New implementation:
1. Build a system prompt encoding the outreach rules:
   - Reference specific page/article
   - Explain value to their readers
   - 3-4 short paragraphs max
   - Clear single CTA
   - No "I hope this email finds you well"
   - Tone matching: formal for trade bodies, conversational for bloggers
2. Build user prompt with prospect context: domain, page title, snippet, opportunity type, contact name/role, project URL, project niche
3. Call Anthropic Claude `claude-sonnet-4-6`
4. Parse response into subject + body
5. Generate HTML version from the text
6. Return both versions

### 9.2 Update: `POST /api/outreach/generate`

- Replace the template-based call with the AI-powered one
- No API contract changes — same request/response shape
- Mark `ai_generated = true` on the outreach_email record

### 9.3 Prompt template

Store in `src/lib/prompts/outreach.ts`:

```typescript
export function buildOutreachPrompt(prospect, project, options): { system: string; user: string }
```

Separate file so prompts can be iterated without touching logic.

---

## Phase 10 — UI Polish & Integration

**Goal:** Wire everything together and handle the edges.

### 10.1 Update ProspectsBoard

- Update Kanban columns to reflect new statuses: Identified → Enriched → Outreach Drafted → Outreach Queued → Contacted → Followed Up → Won / Lost
- Show `entry_method` badge on prospect cards (discovery / import / manual)
- Show linkability score on cards
- Add "Import" and "Discover" quick-action buttons at the top

### 10.2 Update Project Overview page

- Show site analysis results (niche, description, DR, keywords)
- Show existing backlink count + "Sync" button
- Show prospect stats broken down by entry method
- Add "Run Discovery" and "Import Prospects" action cards

### 10.3 Reports page

- Total prospects by status (funnel chart)
- Top 10 prospects by linkability score
- Enrichment rate (% with contact found)
- Discovery vs Import breakdown

---

## Build Order

This is the recommended sequence. Each phase can be built and tested independently.

| Order | Phase | Depends on | Estimated complexity |
|-------|-------|-----------|---------------------|
| 1 | **Phase 1** — Schema & types | Nothing | Low — SQL + TypeScript changes |
| 2 | **Phase 2** — API integrations | Phase 1 | Medium — 4 API client wrappers |
| 3 | **Phase 6** — Scoring logic | Phase 2 | Low — pure functions, no I/O beyond what Phase 2 provides |
| 4 | **Phase 3** — Site analysis | Phase 2 | Medium — new wizard UI + API route |
| 5 | **Phase 5** — Discovery | Phase 2, 6 | High — biggest feature, real search + review UI |
| 6 | **Phase 7** — Import | Phase 2, 6 | High — CSV parsing + validation pipeline + 3-bucket UI |
| 7 | **Phase 4** — Backlink profile | Phase 2 | Low — single API call + store |
| 8 | **Phase 8** — Enrichment | Phase 2 | Low — replace mock with real Hunter.io call |
| 9 | **Phase 9** — AI outreach | Phase 2 | Medium — prompt engineering + Claude integration |
| 10 | **Phase 10** — UI polish | All above | Medium — wiring, status updates, reports |

---

## Files Changed Summary

### New files

| File | Purpose |
|------|---------|
| `supabase/migrations/202602280001_v2_schema_additions.sql` | New tables + column additions |
| `src/lib/integrations/dataforseo.ts` | DataForSEO API client |
| `src/lib/integrations/google-search.ts` | Google Custom Search client |
| `src/lib/integrations/hunter.ts` | Hunter.io API client |
| `src/lib/integrations/anthropic.ts` | Anthropic Claude client |
| `src/lib/site-analysis.ts` | Step 1 site analysis logic |
| `src/lib/backlink-profile.ts` | Step 2 backlink fetch logic |
| `src/lib/scoring.ts` | Step 4 scoring formulas |
| `src/lib/import-validation.ts` | Step 3B validation pipeline |
| `src/lib/csv-parser.ts` | CSV parsing for import |
| `src/lib/exclusions.ts` | Domain exclusion list |
| `src/lib/prompts/outreach.ts` | Outreach prompt templates |
| `app/api/projects/analyse/route.ts` | Site analysis endpoint |
| `app/api/projects/[id]/backlinks/sync/route.ts` | Backlink sync endpoint |
| `app/api/discover/confirm/route.ts` | Discovery confirm endpoint |
| `app/api/prospects/bulk-import/validate/route.ts` | Import validate endpoint |
| `app/api/prospects/bulk-import/confirm/route.ts` | Import confirm endpoint |
| `components/projects/ProjectWizard.tsx` | Step 1 onboarding wizard |
| `components/discover/DiscoveryWorkflow.tsx` | Step 3A discovery + review |
| `components/import/ImportWorkflow.tsx` | Step 3B import + validation |

### Modified files

| File | Changes |
|------|---------|
| `src/lib/types.ts` | New types, updated ProspectStatus, new interfaces |
| `src/lib/validations.ts` | New Zod schemas for import, analysis |
| `src/lib/store.ts` | New CRUD functions for existing_backlinks, import_jobs, bulk create |
| `src/lib/discovery.ts` | Replace mock with real Google Search + DataForSEO |
| `src/lib/enrichment.ts` | Replace mock with real Hunter.io |
| `src/lib/outreach.ts` | Replace template with Anthropic Claude |
| `app/api/discover/route.ts` | Use real discovery, return with job tracking |
| `app/api/prospects/bulk-import/route.ts` | Replace 501 stub |
| `app/api/prospects/enrich/route.ts` | Use real enrichment |
| `app/api/outreach/generate/route.ts` | Use AI generation |
| `app/(dashboard)/projects/new/page.tsx` | Replace placeholder with wizard |
| `app/(dashboard)/projects/[id]/prospects/import/page.tsx` | Replace placeholder with import workflow |
| `app/(dashboard)/discover/page.tsx` | Use new DiscoveryWorkflow |
| `app/(dashboard)/projects/[id]/page.tsx` | Show analysis results + backlink count |
| `components/discover/DiscoveryForm.tsx` | Replace with DiscoveryWorkflow (or delete) |
| `components/prospects/ProspectsBoard.tsx` | Updated columns + entry_method badges |
| `package.json` | Add `@anthropic-ai/sdk` |
| `.env.example` | Add all new API key vars |

---

## What We're NOT Building Yet

These are in the spec or existing codebase but explicitly deferred:

- **Email sending** (`POST /api/outreach/send`) — emails stay as drafts for human review
- **Gmail/Outlook OAuth** — not needed until sending is built
- **Stripe billing** — not blocking any feature
- **Link verification crawler** — post-MVP monitoring feature
- **Keyword alerts** — post-MVP monitoring feature
- **Link exchange community** — separate feature, not part of the 6-step flow
- **White-label reports / PDF export** — agency tier feature
- **Reply webhooks** — needs email sending first

---

*End of plan*
