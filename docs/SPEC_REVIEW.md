# Backlink Hunter — Spec Review

**Date:** 2026-02-27
**Reviewed against:** Full Product Specification v1.0
**Scope:** All artefacts in the repository (`supabase/migrations/`, `src/lib/types.ts`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`)

---

## Executive Summary

The repository contains three foundation artefacts: a Supabase SQL migration, a shared TypeScript types file, and an implementation plan. **No application code (Next.js, components, API routes, config) has been written yet.** The review below evaluates the artefacts that do exist against the spec and catalogues everything that is still missing.

**Overall assessment:** The database schema and TypeScript types are faithful to the spec with minor gaps. The implementation plan covers the right milestones in a logical order. However, the project is at the very beginning of Milestone 1 — the Next.js scaffold, configuration files, and all application logic remain to be built.

---

## 1. Database Schema (`supabase/migrations/202602270001_initial_schema.sql`)

### 1.1 What Matches the Spec

| Spec Section | Status | Notes |
|---|---|---|
| `users` table | **Match** | All columns present; `on delete cascade` from `auth.users` is a good addition. |
| `organisations` table | **Match** | `CHECK` constraint on `plan` correctly limits to `starter \| growth \| agency`. |
| `organisation_members` table | **Match** | `UNIQUE(org_id, user_id)` prevents duplicate memberships — good addition over the spec. |
| `projects` table | **Match** | `target_keywords text[] not null default '{}'` is a sensible default for an array column. |
| `prospects` table | **Match** | All 28 spec columns present. `CHECK` constraint on `status` and `opportunity_type` enums. |
| `outreach_emails` table | **Match** | All columns including threading (`parent_email_id` self-reference). |
| `email_integrations` table | **Match** | Dual-provider model with `CHECK` on `provider`. |
| `link_exchange_listings` table | **Match** | All columns present. |
| `link_exchange_matches` table | **Match** | `CHECK(listing_a_id <> listing_b_id)` prevents self-matching — good defensive constraint. |
| `keyword_alerts` table | **Match** | All columns present. |
| `audit_log` table | **Match** | `user_id on delete set null` is correct — audit entries should survive user deletion. |
| `set_updated_at()` trigger | **Match** | Correctly wired to `prospects` table. |

### 1.2 Good Deviations from Spec

These differences are improvements over what the spec literally states:

1. **`NOT NULL` constraints** — Added on `org_id`, `user_id`, `project_id` FKs and other columns where the spec was implicitly non-null but didn't state it. Good defensive practice.
2. **`ON DELETE CASCADE`** — All FK relationships cascade, which prevents orphan rows.
3. **`CHECK` constraints on enum columns** — `plan`, `role`, `status`, `opportunity_type`, `provider`, `link_exchange_matches.status` all have `CHECK` constraints. The spec only implies these via comment text; the migration enforces them at the DB level.
4. **Extra prospect statuses** — `needs_manual_enrichment` and `verification_error` are added beyond the six in the spec's Kanban section (§5.4). Both are referenced in the spec's Error Handling section (§11), so this is a correct synthesis of requirements from two different sections.
5. **`UNIQUE(org_id, user_id)` on `organisation_members`** — Prevents a user being added to the same org twice.

### 1.3 Issues & Gaps

#### P0 — Must fix before any production use

| # | Issue | Detail | Recommendation |
|---|---|---|---|
| S1 | **No Row Level Security (RLS) policies** | The spec (§6) explicitly requires RLS on all tables scoped to `org_id`. Without RLS, any authenticated user can read/write any org's data via the Supabase client. | Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and policies for each table. At minimum: `USING (org_id IN (SELECT om.org_id FROM organisation_members om WHERE om.user_id = auth.uid()))`. The `users` table needs a separate policy scoped to `id = auth.uid()`. |
| S2 | **`email_integrations` tokens stored in plain text** | The spec notes `access_token` and `refresh_token` should be encrypted. The schema stores them as `text` with no encryption. | Use `pgcrypto` (already enabled) with `pgp_sym_encrypt` / `pgp_sym_decrypt`, or handle encryption at the application layer before storage. Add a comment in the migration noting the encryption strategy. |

#### P1 — Should fix during current milestone

| # | Issue | Detail | Recommendation |
|---|---|---|---|
| S3 | **Missing composite index for Kanban queries** | Three separate single-column indexes exist on `prospects` (`org_id`, `project_id`, `status`). The Kanban view (§5.4) will query `WHERE project_id = $1 AND org_id = $2 ORDER BY status` — a composite index would be far more efficient. | Replace the three individual indexes with `CREATE INDEX idx_prospects_project_status ON prospects(project_id, status) INCLUDE (org_id);` (or a composite `(org_id, project_id, status)`). |
| S4 | **Missing index on `email_integrations(org_id, user_id)`** | The send flow (§5.6) looks up an org's connected email integration. Without an index, this is a full table scan. | Add `CREATE INDEX idx_email_integrations_org_user ON email_integrations(org_id, user_id);` |
| S5 | **Missing index on `link_exchange_listings(niche)`** | The matching logic (§5.9) queries by `niche` for compatible partners. | Add `CREATE INDEX idx_link_exchange_listings_niche ON link_exchange_listings(niche);` |
| S6 | **Missing indexes on `link_exchange_matches`** | No indexes on `listing_a_id` or `listing_b_id`. Matching queries will need to join through these. | Add indexes on both FK columns. |
| S7 | **No `updated_at` on `outreach_emails`** | The `prospects` table has `updated_at` with a trigger, but `outreach_emails` does not. Tracking when an email draft was last edited is important for the outreach workflow. | Add `updated_at` column and a corresponding trigger. |
| S8 | **No uniqueness constraint on `email_integrations` per provider** | A user could connect the same Gmail account twice. | Add `UNIQUE(org_id, user_id, provider)` or `UNIQUE(org_id, email_address)`. |
| S9 | **`prospects.link_live` defaults to `false` without a status guard** | When a prospect is first created (`status = 'identified'`), `link_live = false` is technically correct, but it's semantically the same as "link never existed" and "link was lost". | Consider making `link_live` nullable (`NULL` = not applicable, `true` = live, `false` = lost). This distinguishes "never had a link" from "link was removed". |

#### P2 — Nice to have / consider

| # | Issue | Detail |
|---|---|---|
| S10 | **No `prospect_domain` index** | De-duplication logic will likely need to query by domain. Consider `CREATE INDEX idx_prospects_domain ON prospects(prospect_domain);` |
| S11 | **No `link_exchange_listings(org_id)` index** | Needed for the listing management page. |
| S12 | **`audit_log` has no `created_at` index** | Time-range queries on the audit log will be slow at scale. Consider `CREATE INDEX idx_audit_log_created_at ON audit_log(org_id, created_at DESC);` |
| S13 | **No database-level enforcement of plan limits** | The spec (§8) says overage should be blocked. Currently `prospects_used_this_month` is just a counter with no trigger or constraint preventing inserts past the limit. | This could be enforced via an application-level check, but a DB trigger or policy would be more robust. |

---

## 2. TypeScript Types (`src/lib/types.ts`)

### 2.1 What Matches the Spec

| Type | Status | Notes |
|---|---|---|
| `PlanTier` | **Match** | `'starter' \| 'growth' \| 'agency'` |
| `OrgRole` | **Match** | `'owner' \| 'admin' \| 'member'` |
| `OpportunityType` | **Match** | All five values from the spec. |
| `ProspectStatus` | **Match+** | Includes spec's six Kanban statuses plus `needs_manual_enrichment` and `verification_error` from §11. Correctly matches the DB schema. |
| `OutreachEmailStatus` | **Match** | `'draft' \| 'scheduled' \| 'sent' \| 'failed'` |
| `EmailProvider` | **Match** | `'gmail' \| 'outlook'` |
| `DiscoverRequest` | **Match** | All fields from §5.1 request body. The `Exclude<OpportunityType, 'mention'>` is a correct refinement — discovery is for actionable types; `mention` is a classification output, not a discovery input. |
| `OutreachGenerateRequest` | **Match** | All fields from §5.3 request body. `followup_number?: 1 \| 2` is stricter than the spec but aligns with the described two-followup limit. |
| `OutreachGenerateResponse` | **Match** | All fields from §5.3 response body. |
| `ProspectRecord` | **Match** | All 28 fields with correct nullability. Timestamp fields are typed as `string` which is the standard Supabase/JSON serialisation. |

### 2.2 Issues & Gaps

#### P1 — Missing types needed for implementation

| # | Issue | Recommendation |
|---|---|---|
| T1 | **No types for most database entities** | Only `ProspectRecord` has a full interface. Missing: `User`, `Organisation`, `OrganisationMember`, `Project`, `OutreachEmail`, `EmailIntegration`, `LinkExchangeListing`, `LinkExchangeMatch`, `KeywordAlert`, `AuditLogEntry`. These will be needed as soon as page/API development begins. | Add interfaces for all DB tables. Consider generating them from the schema with a tool like `supabase gen types typescript`. |
| T2 | **No `OutreachTone` type reuse** | The `tone` field is an inline union `'professional' \| 'friendly' \| 'concise'` inside `OutreachGenerateRequest`. If tone values are referenced elsewhere (UI selectors, prompt templates), this should be a standalone type. | Extract `export type OutreachTone = 'professional' \| 'friendly' \| 'concise';` |
| T3 | **No `LinkExchangeMatchStatus` type** | The schema has a `CHECK` on `link_exchange_matches.status` but there's no corresponding TS type. | Add `export type LinkExchangeMatchStatus = 'pending' \| 'accepted' \| 'declined' \| 'completed';` |
| T4 | **No `ContactSource` type** | Spec §5.2 mentions `'hunter.io' \| 'apollo' \| 'manual' \| 'scraped'`. | Add the type for consistency and validation. |
| T5 | **No API error response type** | No standard error shape defined for API responses. | Add `export interface ApiError { code: string; message: string; details?: unknown; }` or similar. |
| T6 | **`DiscoverRequest.limit` is optional but spec says "default 50"** | The type allows `undefined` but doesn't document the default. | This is fine at the type level — the default should be applied in the API handler. Just note it in a JSDoc comment. |

---

## 3. Implementation Plan (`docs/IMPLEMENTATION_PLAN.md`)

### 3.1 Alignment with Spec

The six milestones map well to the spec's feature sections:

| Milestone | Spec Sections Covered | Verdict |
|---|---|---|
| 1 — Foundation | §2, §3, §4 | Partially done (schema + types exist; Next.js scaffold is missing) |
| 2 — Auth + Org Context | §6, §7 (partially) | Correct sequencing — auth before features |
| 3 — Discovery + Enrichment | §5.1, §5.2 | Correct |
| 4 — Outreach Workflow | §5.3, §5.4, §5.5, §5.6 | Correct — Kanban + email composer + sending |
| 5 — Monitoring + Reporting | §5.7, §5.8, §5.10, §8 | Correct — link verification, alerts, reports, billing |
| 6 — Hardening | §6, §11 | RLS + error handling + Sentry |

### 3.2 Issues & Gaps

| # | Issue | Detail |
|---|---|---|
| P1 | **RLS is deferred to Milestone 6** | The spec (§6) says RLS is a core security requirement. Deferring it to the last milestone means all intermediate milestones are developed and potentially tested without tenant isolation. A compromised or misconfigured Supabase client key during development could leak data between test orgs. **Recommendation:** Move RLS policy creation to Milestone 2 (Auth + Org Context). It's a natural fit since that milestone already deals with org-scoped querying. |
| P2 | **Onboarding flow (§7) not explicitly mentioned** | The spec describes a five-step onboarding wizard. The plan doesn't assign it to a milestone. It likely falls under Milestone 2 or 3 but should be called out explicitly. |
| P3 | **Link Exchange Community (§5.9) not assigned** | The link exchange feature (listings + matching board) isn't mentioned in any milestone despite the tables being in the schema. | Should be assigned — likely Milestone 4 or 5. |
| P4 | **Stripe integration is vague** | Milestone 5 mentions "Stripe plan enforcement" but doesn't break down: webhook handler, subscription management, billing portal integration, metered usage tracking, or the pricing tiers from §8. |
| P5 | **No mention of CSV/bulk import** | Spec §5.4 and the API structure include `/api/prospects/bulk-import` and an import page at `/projects/[id]/prospects/import`. Not mentioned in any milestone. |
| P6 | **No mention of white-label report exports** | Spec §8 (Agency plan) includes PDF and white-label report exports. Not planned. |

---

## 4. Missing Artefacts (Not Yet Created)

Everything below is required by the spec but does not yet exist in the repository:

### 4.1 Project Configuration (Milestone 1 — Blocked)

| File | Purpose | Spec Reference |
|---|---|---|
| `package.json` | Dependencies, scripts | §2 |
| `next.config.ts` | Next.js configuration | §2 |
| `tsconfig.json` | TypeScript compiler config | §2 |
| `tailwind.config.ts` | Tailwind + shadcn theme | §2 |
| `.env.example` | Environment variable template | §9 |
| `postcss.config.js` | PostCSS for Tailwind | §2 |
| `supabase/config.toml` | Local Supabase project config | §2 |
| `middleware.ts` | Next.js middleware (auth guard, org context) | §6 |

### 4.2 Application Routes (Spec §4)

None of the following routes exist:

**Auth routes:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/(auth)/forgot-password/page.tsx`

**Dashboard routes:**
- `app/(dashboard)/layout.tsx` — sidebar + org switcher
- `app/(dashboard)/page.tsx` — overview dashboard
- `app/(dashboard)/projects/page.tsx` — project list
- `app/(dashboard)/projects/new/page.tsx` — create project wizard
- `app/(dashboard)/projects/[id]/page.tsx` — project overview
- `app/(dashboard)/projects/[id]/prospects/page.tsx` — Kanban pipeline
- `app/(dashboard)/projects/[id]/prospects/import/page.tsx` — bulk import
- `app/(dashboard)/projects/[id]/outreach/page.tsx` — outreach queue
- `app/(dashboard)/projects/[id]/settings/page.tsx` — project settings
- `app/(dashboard)/discover/page.tsx` — discovery tool
- `app/(dashboard)/link-exchange/page.tsx` — community board
- `app/(dashboard)/reports/page.tsx` — ROI dashboard
- `app/(dashboard)/settings/page.tsx` — org settings
- `app/(dashboard)/settings/billing/page.tsx` — Stripe portal
- `app/(dashboard)/settings/integrations/page.tsx` — email connections
- `app/(dashboard)/settings/team/page.tsx` — team management

### 4.3 API Routes (Spec §4, §5)

None of the following API routes exist:

- `app/api/discover/route.ts`
- `app/api/prospects/enrich/route.ts`
- `app/api/prospects/bulk-import/route.ts`
- `app/api/outreach/generate/route.ts`
- `app/api/outreach/send/route.ts`
- `app/api/outreach/webhook/reply/route.ts`
- `app/api/links/verify/route.ts`
- `app/api/links/monitor/route.ts`
- `app/api/alerts/check/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/auth/callback/route.ts`

### 4.4 Components (Spec §4)

None of the following components exist:

**Prospects:** `KanbanBoard`, `KanbanColumn`, `ProspectCard`, `ProspectDetailDrawer`, `ProspectFilters`, `BulkActions`

**Outreach:** `EmailComposer`, `EmailThread`, `FollowUpScheduler`

**Discover:** `DiscoveryForm`, `OpportunityTable`, `EnrichmentStatus`

**Reports:** `LinkHealthChart`, `PipelineFunnelChart`, `ROICard`

**Shared:** `ProspectStatusBadge`, `LinkabilityScore`, `DomainAuthorityBadge`, `PageLoader`, `EmptyState`

### 4.5 Backend / Integration Logic

| Component | Spec Reference |
|---|---|
| Supabase client helpers (browser + server) | §2 |
| Supabase Auth config (providers, redirect URLs) | §6, §7 |
| Gmail OAuth flow + send/receive helpers | §5.6, §9 |
| Outlook OAuth flow + send/receive helpers | §5.6, §9 |
| Anthropic Claude integration (prompt template, API call) | §5.3, §9 |
| Stripe checkout/portal/webhook handler | §8, §9 |
| Hunter.io / Apollo.io enrichment client | §5.2, §9 |
| Moz / DataForSEO DA/PA lookup client | §5.1, §9 |
| Google Custom Search API client | §5.1, §9 |
| Link verification crawler | §5.7 |
| Keyword alert scanner | §5.8 |
| Sentry setup | §9 |
| pg_cron job definitions | §5.7, §5.8 |

---

## 5. Summary of Findings by Priority

### P0 — Critical / Security

| # | Finding | Location |
|---|---|---|
| S1 | No RLS policies — any Supabase client can read/write any org's data | Schema migration |
| S2 | Email OAuth tokens stored in plain text | Schema migration |
| P1 (plan) | RLS deferred to final milestone — should be Milestone 2 | Implementation plan |

### P1 — High / Correctness

| # | Finding | Location |
|---|---|---|
| S3 | Missing composite index for Kanban queries | Schema migration |
| S4–S6 | Missing indexes on `email_integrations`, `link_exchange_listings`, `link_exchange_matches` | Schema migration |
| S7 | No `updated_at` on `outreach_emails` | Schema migration |
| S8 | No uniqueness constraint on email integrations per provider | Schema migration |
| T1 | Missing TypeScript interfaces for 10 of 11 DB tables | `types.ts` |
| P2–P6 | Onboarding, link exchange, CSV import, white-label exports, Stripe details not planned | Implementation plan |

### P2 — Medium / Performance & Robustness

| # | Finding | Location |
|---|---|---|
| S9 | `link_live` semantics conflate "never had" and "lost" | Schema migration |
| S10–S12 | Missing indexes on `prospect_domain`, `link_exchange_listings.org_id`, `audit_log.created_at` | Schema migration |
| S13 | No DB-level enforcement of plan prospect limits | Schema migration |
| T2–T6 | Missing utility types (`OutreachTone`, `LinkExchangeMatchStatus`, `ContactSource`, `ApiError`) | `types.ts` |

---

## 6. Recommended Next Steps

1. **Fix P0 items immediately** — add RLS policies and token encryption strategy in a follow-up migration.
2. **Complete Milestone 1** — scaffold the Next.js app, install dependencies, add config files, create the component/route directory structure.
3. **Update the implementation plan** — assign onboarding flow, link exchange feature, CSV import, and Stripe integration to specific milestones. Move RLS to Milestone 2.
4. **Generate full TypeScript types** — use `supabase gen types typescript` or manually add interfaces for all DB tables.
5. **Add a second migration** for index improvements (`S3–S6, S10–S12`), `updated_at` on `outreach_emails` (`S7`), and uniqueness constraint on `email_integrations` (`S8`).

---

*End of review*
