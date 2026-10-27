---
title: "Targeted Docusaurus integration"
work_id: "EPIC-docusaurus-frontend-migration"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/docusaurus-frontend-migration"
depends_on: []
---

# Targeted Docusaurus integration

## Outcome and MVP traceability

Docusaurus is integrated only where it has immediate positive impact: making project work, contracts and decisions easy to see and trust during development. The Vite React booking app is **not** migrated.

## Scope and non-goals

Decision (user, 2026-10-26): integrate Docusaurus only where immediately impactful; no full frontend migration for now.

Current state: Docusaurus in `docs-site/` serves `/internal/docs/` in development only, proxied by `frontend/vite.config.mjs`, with a work dashboard (`docs-site/src/pages/work.js`, `docs-site/work-index.cjs`) reading work documents and Git history. It is excluded from production/tunnel builds.

In scope (immediate-impact items):

- Clean docs build: resolve the broken links in imported docs (`backend/README.MD`, `docs/legacy/tasks/**`) so new broken links are visible, then fail the build on broken links in `docs/epics/**`, `docs/planning/**` and `docs/reference/**`.
- Dashboard planning view: show Epic `depends_on` relationships, readiness (all prerequisites done) and execution waves derived from front matter, so parallel branch work is visible at a glance.
- Contract publishing home: a `docs/reference/contracts/` section where Epics publish shared contracts (display template schema, receipt claim API, seed factory decision, MCP tool catalogue, organization branding schema), linked from each owning Epic.
- Automated check: a docs build plus smoke test for `/internal/docs/`, `/internal/docs/work/` and the work-index API, runnable locally and in CI.

Non-goals: moving booking, auth, cart, checkout or organizer routes into Docusaurus; publishing docs in production/tunnel builds; localizing internal docs; customer-facing help center (revisit later).

## Acceptance criteria

- [ ] Docusaurus build has no broken-link warnings, and broken links in planning/reference docs fail the build.
- [ ] Work dashboard shows each Epic's dependencies, readiness and wave; values come only from committed front matter.
- [ ] `docs/reference/contracts/` exists with an index and is in the sidebar; Epics that own contracts link to their entry.
- [ ] Automated docs build and route smoke test pass; booking app routes and the production/tunnel overlay are unchanged.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `docs-site/**`; `docs/reference/contracts/index.md`; link fixes in `backend/README.MD` and `docs/legacy/**`; docs smoke test script.
- Shared files/contracts and owner: This Epic owns the contracts section structure; each feature Epic owns its own contract page content. No changes to `frontend/src/**`, backend APIs or deployment overlays.
- Parallel-ready assessment: Parallel-ready now. Low conflict risk; other Epics only add pages under `docs/reference/contracts/`.

## Dependencies and integration

No prerequisites. Landing early helps every other Epic: dependency/wave visibility and a home for published contracts. No Epic depends on it technically.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Assumption: `/internal/docs/` stays development-only and unauthenticated; any public exposure needs a separate decision.
- Assumption: no Git metadata is available in the current workspace; the dashboard must keep showing a clear warning rather than inferring commits.
- Full frontend migration is deferred, not rejected; revisit if static rendering/SEO for organization sites (Epic 9) justifies it.

## Verification and completion evidence

Run `docker compose run --rm --no-deps internal-docs npm run build` with zero broken-link warnings, the docs smoke test, `node --test scripts/planning.test.mjs` and the docs-site Git utility tests.

## Progress and decisions

- 2026-10-26: Scope narrowed by user to immediately impactful integration; full migration removed from scope.
