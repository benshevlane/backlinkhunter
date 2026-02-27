# Backlink Hunter — Branch Review (All Non-Main Branches)

**Date:** 2026-02-27
**Reviewed against:** Full Product Specification v1.0

---

## Overview

Six `codex/` branches exist alongside `main`. All were created to implement the product specification. This review analyses each branch, identifies the strongest candidate, and catalogues issues across all of them.

| # | Branch Suffix | Commits | Files Changed | Lines Added | Key Differentiator |
|---|---|---|---|---|---|
| 1 | *(base, no suffix)* | 1 | 4 | +369 | Already merged to main — foundation only (schema + types + plan) |
| 2 | `-4utpgv` | 1 | 54 | +1,424 | Full scaffold + simulated discovery, enrichment, outreach |
| 3 | `-9dhdcn` | 1 | 57 | +1,680 | **Most complete** — adds outreach workspace + reports dashboard |
| 4 | `-kp6erl` | 1 | 54 | +1,424 | Near-identical to `-4utpgv` (same commit message, same line count) |
| 5 | `-rkw3da` | 1 | 50 | +876 | Scaffold only — no discovery/enrichment/outreach simulation |
| 6 | `-tbkk28` | 4 | 54 | +1,422 | Same scope as `-4utpgv`/`-kp6erl`, split across 4 commits |

---

## Branch-by-Branch Summary

### 1. Base branch (already merged to main)

**Commit:** `47fe0f7 Initialize Backlink Hunter foundation artifacts`

Delivers only the engineering foundation — no application code:
- Supabase SQL migration (11 tables, triggers, indexes)
- Shared TypeScript types (`types.ts`)
- Implementation plan + README

**Verdict:** Already merged. Reviewed in `SPEC_REVIEW.md`.

---

### 2. `-4utpgv`

**Commit:** `30c8c31 Resolve types merge overlap in discovery contracts`

Full Next.js scaffold with working local pipeline:
- 19 page routes (4 functional, 15 placeholder)
- 14 API routes (6 functional, 8 stub)
- 5 components
- File-based JSON dev store
- Simulated discovery, enrichment, and outreach draft generation
- Added `ProjectRecord`, `DiscoverOpportunity`, `DiscoverResponse`, `EnrichProspectRequest`, `EnrichProspectResponse`, `OutreachEmailRecord` types

---

### 3. `-9dhdcn` (Most Complete)

**Commit:** `447686e Build outreach workspace and reports frontend pages`

Everything in `-4utpgv` plus:
- **Outreach workspace page** (`/projects/[id]/outreach`) — functional page that lists outreach drafts per project with "Generate Draft" action
- **Reports overview page** (`/reports`) — functional dashboard showing pipeline funnel metrics and conversion rates
- **`OutreachWorkspace` component** — client component for generating/reviewing drafts
- **`ReportsOverview` component** — client component rendering pipeline funnel stats
- **Extra API route** (`/api/projects/[id]/outreach`) — GET endpoint for listing outreach emails per project
- **Expanded store** — `listOutreachEmailsForProject()` function added (204 lines total vs 192 in other branches)
- 7 components total (vs 5 in other branches)
- 15 API routes (vs 14 in others)

---

### 4. `-kp6erl`

**Commit:** `f596ddb Resolve types merge overlap in discovery contracts`

Near-identical to `-4utpgv` — same file count (54), same line count (+1,424), same structure. Different commit hash but same commit message pattern. Appears to be a parallel run that produced equivalent output.

---

### 5. `-rkw3da`

**Commit:** `bdf4680 Implement local projects and prospects workflow`

Slimmer scaffold — delivers the project/prospect pipeline but:
- No simulated discovery engine
- No simulated enrichment
- No simulated outreach draft generation
- No `DiscoveryForm` component
- 4 components (vs 5-7 in other branches)
- Added `ProjectRecord` type only (no discover/enrich/outreach types)

**Verdict:** Subset of what the other branches deliver.

---

### 6. `-tbkk28`

**Commit history (4 commits):**
1. `db67859 Implement local projects and prospects workflow`
2. `7e1018e Implement discovery endpoint and dashboard UI`
3. `859f31c Implement prospect enrichment and outreach draft workflows`
4. `96c0c85 Resolve README merge conflict content`

Same scope as `-4utpgv`/`-kp6erl` but split into incremental commits. The 4-commit history provides better traceability of what was built in what order.

---

## Cross-Branch Issue Analysis

Every branch (except the already-merged base) shares the same core codebase with minor variations. The issues below apply across all of them unless noted.

### P0 — Critical / Security

| # | Issue | Branches | Detail |
|---|---|---|---|
| B1 | **No authentication or authorization** | All | Every API route is completely open. `org_id` is hardcoded to `'local-dev-org'`. No `middleware.ts` exists. Anyone can read/write all data. |
| B2 | **No CSRF protection** | All | POST/PATCH routes accept raw JSON with no CSRF token. Exploitable with cookie-based auth. |
| B3 | **XSS risk in outreach HTML generation** | `-4utpgv`, `-9dhdcn`, `-kp6erl`, `-tbkk28` | In `src/lib/outreach.ts`, user-provided `custom_value_prop` and prospect data are interpolated into `body_html` without HTML escaping. If rendered in the email composer, this enables stored XSS. |

### P1 — High / Correctness

| # | Issue | Branches | Detail |
|---|---|---|---|
| B4 | **`window.location.reload()` instead of `router.refresh()`** | All | `CreateProjectForm`, `CreateProspectForm`, `ProspectsBoard` (and `OutreachWorkspace` in `-9dhdcn`) all cause a full page reload after mutations. This is an anti-pattern in Next.js App Router — `useRouter().refresh()` re-runs server components without losing client state. |
| B5 | **ProspectsBoard missing 3 of 9 statuses** | All | The board shows 6 columns (`identified`, `outreach_queued`, `contacted`, `followed_up`, `won`, `lost`) but the type system and API allow `not_relevant`, `needs_manual_enrichment`, `verification_error`. Prospects in those statuses become invisible — unreachable from the UI. |
| B6 | **`request.json()` not wrapped in try/catch** | All | All functional API routes call `await request.json()` without error handling. Malformed JSON bodies produce an unstructured 500 instead of a clean 400. |
| B7 | **Race condition in file-based store** | All | `readStore()` then `writeStore()` with no locking. Concurrent requests will silently lose writes. Acceptable for single-user dev but should be documented. |
| B8 | **`updateProspect()` allows overwriting immutable fields** | `-4utpgv`, `-9dhdcn`, `-kp6erl`, `-tbkk28` | `updateProspect(id, patch: Partial<ProspectRecord>)` spreads the patch without stripping `id`, `org_id`, `project_id`, `created_at`. |
| B9 | **`DiscoveryForm` hardcodes `projectId` to `'local-project'`** | `-4utpgv`, `-9dhdcn`, `-kp6erl`, `-tbkk28` | The discovery form uses a hardcoded project ID that won't match any real project UUID. Should accept a prop or provide a project selector. |
| B10 | **No input validation beyond field presence** | All | API routes cast bodies with `as Partial<T>` — no runtime validation (Zod, joi). Extra/mistyped fields pass silently. |

### P2 — Medium / Patterns & Quality

| # | Issue | Branches | Detail |
|---|---|---|---|
| B11 | **`alert()` for error feedback** | All | All client components use `alert('Failed to ...')`. Blocks UI thread, no useful detail. Should use toasts or inline errors. |
| B12 | **No `loading.tsx` or `error.tsx` boundaries** | All | No React error/loading boundaries anywhere. Store failures crash the page with the default Next.js error screen. |
| B13 | **No `.env.example`** | All | Spec review flagged this as needed. Still missing. |
| B14 | **No `package-lock.json`** | All | Dependency resolution is non-deterministic across environments. |
| B15 | **No `.gitignore` for `.data/`** | All | The file store writes to `.data/dev-store.json`. Risk of committing dev data. |
| B16 | **Mixed directory convention** | All | Components at `/components/` (root) but library code at `/src/lib/`. Inconsistent — typically either all under `src/` or all at root. |
| B17 | **No `export const dynamic = 'force-dynamic'`** | All | Server components that read from the file store may be statically cached at build time, serving stale data. |
| B18 | **Duplicate `DiscoveryOpportunity` type** | `-4utpgv`, `-9dhdcn`, `-kp6erl`, `-tbkk28` | Defined in both `src/lib/discovery.ts` (as `DiscoveryOpportunity`) and `src/lib/types.ts` (as `DiscoverOpportunity`). Same shape, will drift. |
| B19 | **Next.js 14 `params` access may need `await`** | All | Pages destructure `params` synchronously. Works on 14.2.5 but will break on Next.js 15. |
| B20 | **`ReportsOverview` uses `replace('_', ' ')` not `replaceAll`** | `-9dhdcn` only | `status.replace('_', ' ')` only replaces the first underscore. `needs_manual_enrichment` renders as `needs manual_enrichment`. |

---

## Recommendation: Best Branch

**`-9dhdcn` is the strongest candidate** for the following reasons:

1. **Most feature coverage** — it's the only branch with a working outreach workspace page, reports dashboard, and the extra API endpoint (`/api/projects/[id]/outreach`). It delivers 7 components vs 4-5 in others.

2. **Spec alignment** — it touches more of the spec's feature surface:
   - Outreach queue/drafts (§5.3, §5.5)
   - Pipeline funnel and outreach metrics (§5.10)

3. **Same foundation quality** — the configuration, route structure, and store implementation are identical to the other full-scaffold branches.

4. **Single commit** — clean history, easy to review.

However, `-tbkk28` has a better **commit history** (4 incremental commits showing the logical progression from scaffold → discovery → enrichment/outreach). If the team values commit granularity over feature completeness, it's an alternative choice — though it lacks the outreach workspace and reports pages.

### Comparison Matrix

| Feature | `-rkw3da` | `-4utpgv` | `-kp6erl` | `-tbkk28` | **`-9dhdcn`** |
|---|---|---|---|---|---|
| Next.js scaffold | Yes | Yes | Yes | Yes | **Yes** |
| All page routes | Yes | Yes | Yes | Yes | **Yes** |
| All API route stubs | Yes | Yes | Yes | Yes | **Yes** |
| File-based dev store | Yes | Yes | Yes | Yes | **Yes** |
| Simulated discovery | No | Yes | Yes | Yes | **Yes** |
| Simulated enrichment | No | Yes | Yes | Yes | **Yes** |
| Simulated outreach | No | Yes | Yes | Yes | **Yes** |
| Outreach workspace page | No | No | No | No | **Yes** |
| Reports dashboard | No | No | No | No | **Yes** |
| Outreach API list endpoint | No | No | No | No | **Yes** |
| Added TypeScript types | 1 | 6 | 6 | 5 | **6** |
| Total components | 4 | 5 | 5 | 5 | **7** |
| Commit granularity | 1 | 1 | 1 | 4 | 1 |

---

## Top 10 Issues to Fix (Across All Branches)

Ordered by impact, applicable to whichever branch is chosen:

1. **Add authentication** — integrate Supabase Auth, add `middleware.ts`, protect all API routes and dashboard pages.
2. **Add RLS policies** — enable row-level security on all Supabase tables (this was the P0 from the original spec review and remains unaddressed).
3. **Replace `window.location.reload()` with `router.refresh()`** — eliminate full page reloads after mutations across all client components.
4. **Add the 3 missing statuses to ProspectsBoard** — `not_relevant`, `needs_manual_enrichment`, `verification_error` need columns or a catch-all section so prospects don't become invisible.
5. **Wrap `request.json()` in try/catch** — return 400 for malformed JSON instead of unhandled 500s.
6. **HTML-escape user input in outreach templates** — prevent stored XSS in `body_html` generation.
7. **Add `export const dynamic = 'force-dynamic'`** to data-fetching server component pages.
8. **Add runtime input validation** (Zod recommended) to all API routes — stop relying on TypeScript type assertions at runtime.
9. **Add `loading.tsx` and `error.tsx`** boundary files for graceful degradation.
10. **Add `.env.example`, `package-lock.json`, and `.gitignore` for `.data/`** — basic project hygiene.

---

*End of branch review*
