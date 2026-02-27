# Backlink Hunter

Backlink Hunter is a SaaS platform for discovering backlink opportunities, enriching contact data, generating AI-assisted outreach emails, and tracking link-building ROI.

This repository currently contains the **initial engineering foundation**:

- Product and implementation blueprint in `docs/`
- Initial Supabase/PostgreSQL schema migration in `supabase/migrations/`
- Shared TypeScript domain and API contract types in `src/lib/types.ts`

## Tech Stack Target

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Edge Functions)
- Stripe, Gmail API, Microsoft Graph, Anthropic Claude

## Next Steps

1. Bootstrap Next.js app structure (`app/`, `components/`, `api/` routes)
2. Add Supabase client/server helpers and RLS policies
3. Implement onboarding flow and project dashboard skeleton
4. Add discovery, enrichment, outreach generation, and sending endpoints
5. Instrument with Sentry and add Stripe billing portal integration
