# Trade-OS CRM

The core CRM for Trade-OS — forked from `truficient`'s admin CRM (`/admin/*`),
with the public marketing/SEO site, blog, calculators, and scanner stripped out.
Workedge, Ottopay, and future apps talk to this as the central hub via API/MCP.

## Status

This is a fresh fork, not yet multi-tenant. The `crm_*` (and related) Supabase
schema was built for a single company (Truficient) — before onboarding a second
contractor, every CRM table needs a `company_id`/tenant column and RLS policies
scoping all reads/writes to the logged-in user's own company.

## Setup

1. Create a **new** Supabase project for Trade-OS (do not reuse Truficient's,
   Workedge's, or Ottopay's project).
2. Copy `.env.example` to `.env` and fill in the new project's credentials.
3. `npm install`
4. `npx supabase link` and apply `supabase/migrations/` to the new project.
5. `npm run dev`

## What's here vs. what isn't

- **Here:** customers, companies, jobs, pipeline, estimates, materials,
  invoicing, contracts, calendar/dispatch, teams/timesheets, automations, AI
  settings, knowledge base — the actual CRM/ops surface.
- **Not here:** the public marketing site, blog, SEO tooling, calculators,
  and the equipment scanner — those stay in `truficient` (or move to
  `trade-os-site`) since they're not part of the multi-tenant CRM core.
