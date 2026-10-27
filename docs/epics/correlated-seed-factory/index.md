---
title: "Correlated seed factory spike and seeder rewrite plan"
work_id: "EPIC-correlated-seed-factory"
work_type: epic
template_version: 1
status: in-progress
parent: null
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Correlated seed factory spike and seeder rewrite plan

## Outcome and MVP traceability

A concept spike proves a repeatable way to generate multiple correlated records from a schema, and its result is a full, staged plan to rewrite the project's seeders on that approach.

## Scope and non-goals

Research/design Epic, forming a full seeder rewrite plan off a concept spike. Current seeders: `backend/server/seeders/20260212222654-startup-org-and-admin.js` and `20260214193720-demo-experiences.js`; demo data uses inline random helpers. Compare schema-driven in-house factory with appropriate third-party JavaScript/Sequelize factory libraries. Document correlated associations, determinism, override/traits, idempotency, cleanup, migrations, tests, maintenance, dependencies and licensing.

The concept spike generates a correlated organization -> members -> experiences -> sessions -> ticket tiers -> orders -> comments graph, including media uploaded through the real media pipeline (needed by the hero Epic's `tacos-hero.mp4` seed). The rewrite plan covers replacing both existing seeders, the feature seed examples requested by other Epics, and Cypress/backend test fixtures.

Non-goals in this Epic: executing the full rewrite (planned here, delivered as follow-up Stories), production schema changes.

## Acceptance criteria

- [x] Decision/design doc compares adopt/build alternatives against repository constraints, maintenance and licensing, and recommends one.
- [x] Recommendation specifies schema/input format, correlated relationships, reproducibility (explicit seed), overrides/traits, idempotency and cleanup.
- [x] Isolated concept spike emits the correlated graph and validates schema references; Jest verifies same-seed equality and the store contract.
- [x] Media adapter calls the authenticated `/api/media/upload` route and persists the returned object key in the Experience `images` JSON database field; the upload/persistence interface is tested with a stub.
- [x] Rewrite plan maps both existing seeders, Cypress JSON fixtures and follow-on feature seeds, with migration order and rollback guidance.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `docs/reference/contracts/seed-factory.md` (decision + rewrite plan); spike under `backend/server/seed-factory/**` and its tests. Existing seeders are not edited in this Epic.
- Shared files/contracts and owner: This Epic owns the seed-factory API and fixture format. Single-date, pinned-comments and hero Epics add their seeds using it after publication.
- Parallel-ready assessment: Parallel-ready now; spike code is in a new directory.

## Dependencies and integration

Prerequisite for `EPIC-single-date-experience`, `EPIC-pinned-experience-comments` and `EPIC-hero-gallery-display-template` seeds. The full rewrite follows as Stories once the plan is approved.

## User Stories

Expansion was explicitly requested. Both Stories and their implementation Tasks are expanded and delivered in this branch.

<!-- children:start -->
- [STORY-001: Choose the seed factory architecture and rewrite path](stories/STORY-001-choose-seed-factory-architecture/index.md)
- [STORY-002: Prove deterministic correlated graph generation](stories/STORY-002-prove-correlated-seed-factory/index.md)
<!-- children:end -->

## Risks, assumptions and open questions

- Factories should serve dev/demo seeds, backend tests and Cypress; confirm whether Cypress resets the DB between specs.
- Is a new package acceptable (e.g. `@faker-js/faker` MIT plus an in-house graph builder)? Recommendation: yes for faker; build the correlation layer in-house on Sequelize models.
- Risk: actual media upload requires r2-local and an authenticated `_token` cookie; current route only accepts images, and the app has no standalone Media model/table. The contract stores object-key references in `Experience.images`; MP4 needs a separate API/schema decision.

## Verification and completion evidence

Spike reproducibility and schema-reference checks grounded in `backend/server/models/index.js`; media adapter contract stub-tested. Actual media upload, SQL materialization and user review remain follow-up verification.

## Progress and decisions

- 2026-10-26: User broadened scope to a full seeder rewrite plan based on a concept spike.
- 2026-10-26: Completed Stories and spike; Epic remains `in-progress` because the full rewrite is intentionally a follow-on and not implemented here.
- Spike verification: `backend/tests/seed-factory/seed-factory.test.js` passes (5 tests). Actual media upload and SQL materialization are not run; see contract limitations.
