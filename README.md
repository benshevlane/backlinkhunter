# Backlink Hunter

Backlink Hunter is a SaaS platform for discovering backlink opportunities, enriching contact data, generating AI-assisted outreach emails, and tracking link-building ROI.

## Current State

The repository now includes:

- Product and delivery docs in `docs/`
- Initial Supabase/PostgreSQL schema migration in `supabase/migrations/`
- Shared TypeScript domain/API contract types in `src/lib/types.ts`
- Next.js 14 App Router scaffold for auth and dashboard routes
- Working local project + prospect pipeline backed by a file-based dev store (`.data/dev-store.json`)
- Functional discovery API and dashboard page
- Functional contact enrichment API and outreach draft generation API
- Functional outreach workspace page and reports dashboard page

## Tech Stack Target

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Edge Functions)
- Stripe, Gmail API, Microsoft Graph, Anthropic Claude

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` and go to `/projects`.

## Implemented flow

1. Create a project from `/projects`
2. Open project prospects board
3. Add prospects with URLs and optional contact emails
4. Move prospects across pipeline statuses from the board
5. Enrich prospect contact data from prospect cards
6. Generate outreach drafts from prospect cards
7. Run keyword-based discovery from `/discover` to generate scored opportunity candidates
8. Use `/projects/[id]/outreach` to generate and review drafts
9. View pipeline and conversion metrics in `/reports`

## Next Steps

1. Replace file-based store with Supabase database access layer and organisation scoping.
2. Add Supabase auth/session and role-based route protection.
3. Replace simulated enrichment and draft generation services with real external providers (Hunter/Apollo/Anthropic).
4. Build outreach send + webhook reply lifecycle and thread UI.
5. Add link monitoring jobs, keyword alerts, reports visualisations, billing enforcement, and Sentry instrumentation.
