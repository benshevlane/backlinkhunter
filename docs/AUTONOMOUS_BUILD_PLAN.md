# Autonomous Build Plan to Reach Full Backlink Hunter v1

## What is already functional

- Next.js route scaffold for auth and dashboard areas.
- Supabase target schema migration.
- Local development data store and working prospects pipeline flow:
  - create projects
  - add prospects
  - move prospect statuses

## Remaining work to reach full v1

## Phase 1 — Data + Auth Hardening

1. Replace file-based store with Supabase repository layer.
2. Implement Supabase Auth (email/password + Google OAuth).
3. Add RLS policies + helper SQL functions for org membership checks.
4. Add audit log write hooks for key mutations.

## Phase 2 — Discovery and Enrichment

1. Build `POST /api/discover` with provider abstraction.
2. Implement first provider path using Google Custom Search.
3. Add scoring service for linkability and relevance.
4. Build `/api/prospects/enrich` with Hunter.io and Apollo fallback.
5. Add async batch enrichment job execution.

## Phase 3 — Outreach Lifecycle

1. Implement `/api/outreach/generate` with Anthropic prompt template.
2. Build outreach drafts UI + rich editor + follow-up scheduling.
3. Implement `/api/outreach/send` for Gmail and Outlook.
4. Add webhook handlers for reply sync and thread updates.

## Phase 4 — Monitoring + Reporting

1. Build link verification job and failure-state handling.
2. Build keyword alerts ingestion and notification pipeline.
3. Implement reports dashboard widgets and conversion metrics.
4. Add monthly quota/metering and Stripe plan enforcement.

## Phase 5 — Quality and Operations

1. Add integration tests for API routes and store/repository layer.
2. Add migration validation in CI.
3. Add Sentry instrumentation and structured logging.
4. Add feature flags for risky provider integrations.

## Suggested immediate next PR sequence

1. Supabase client + auth + RLS policies.
2. Real projects/prospects persistence against Supabase.
3. Discovery endpoint implementation.
4. Enrichment endpoint implementation.
5. Outreach generation and drafts.
