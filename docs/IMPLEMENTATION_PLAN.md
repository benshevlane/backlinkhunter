# Backlink Hunter Implementation Plan (v1)

## Scope

This plan translates the product specification into implementation milestones suitable for iterative delivery.

## Milestone 1 — Foundation

- Set up Next.js 14 app router scaffold and shared UI shell.
- Create Supabase migration for all core entities:
  - users, organisations, organisation_members, projects
  - prospects, outreach_emails, email_integrations
  - link_exchange_listings, link_exchange_matches
  - keyword_alerts, audit_log
- Add base TypeScript contracts for database records and API endpoints.

## Milestone 2 — Auth + Organisation Context

- Integrate Supabase Auth (email/password + Google OAuth).
- Implement organisation membership resolution and role checks.
- Enforce org-scoped querying patterns across data access layer.

## Milestone 3 — Prospect Discovery + Enrichment

- Implement `POST /api/discover` with pluggable provider strategy.
- Implement synchronous + asynchronous enrichment flow via `POST /api/prospects/enrich`.
- Build project prospects board with filters and status updates.

## Milestone 4 — Outreach Workflow

- Implement `POST /api/outreach/generate` with Anthropic integration.
- Persist drafts to `outreach_emails` and render in email composer.
- Implement `POST /api/outreach/send` with Gmail/Outlook providers.
- Track replies through webhook endpoint and update pipeline states.

## Milestone 5 — Monitoring + Reporting

- Add daily link verification jobs and keyword alerts.
- Implement reports dashboard for funnel, link health, and outreach metrics.
- Add usage metering + Stripe plan enforcement.

## Milestone 6 — Hardening

- Add robust error handling for token expiry, provider rate limits, and retries.
- Add RLS policies and audit logging.
- Add observability (Sentry), background job telemetry, and QA test coverage.
