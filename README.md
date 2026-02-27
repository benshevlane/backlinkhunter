# Backlink Hunter

Backlink Hunter is a SaaS platform for discovering backlink opportunities, enriching contact data, generating AI-assisted outreach emails, and tracking link-building ROI.

## Current State

The repository now includes:

- Product and delivery docs in `docs/`
- Initial Supabase schema migration in `supabase/migrations/`
- Shared domain/API types in `src/lib/types.ts`
- Next.js 14 App Router scaffold for auth and dashboard routes
- **Working local project + prospect pipeline** (create projects, add prospects, move statuses) backed by a file-based dev store (`.data/dev-store.json`)

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

## What should be built next

1. Replace file-based store with Supabase database access layer and organisation scoping.
2. Add Supabase auth/session and role-based route protection.
3. Implement real `/api/discover` and `/api/prospects/enrich` providers.
4. Build outreach generation/edit/send workflow and email provider integrations.
5. Add link monitoring jobs, keyword alerts, and reports visualisations.
