---
title: "Correlated seed factory spike and seeder rewrite plan"
work_id: "EPIC-correlated-seed-factory"
work_type: epic
template_version: 1
status: draft
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

- [ ] Decision/design doc compares adopt/build alternatives against repository constraints, maintenance and licensing, and recommends one.
- [ ] Recommendation specifies schema/input format, correlated relationships, reproducibility (explicit seed), overrides/traits, idempotency and cleanup.
- [ ] Concept spike, isolated from existing seeders, repeatably generates the correlated graph above with valid associations, verified by a test that runs it twice with the same seed and compares results.
- [ ] Spike demonstrates seeding a media asset through the media pipeline so it exists as a DB media record.
- [ ] Rewrite plan lists each existing seeder and fixture, its replacement, migration order, rollback and how other Epics add feature seeds (single-date, pinned comments, hero video).

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `docs/reference/contracts/seed-factory.md` (decision + rewrite plan); spike under `backend/server/seed-factory/**` and its tests. Existing seeders are not edited in this Epic.
- Shared files/contracts and owner: This Epic owns the seed-factory API and fixture format. Single-date, pinned-comments and hero Epics add their seeds using it after publication.
- Parallel-ready assessment: Parallel-ready now; spike code is in a new directory.

## Dependencies and integration

Prerequisite for `EPIC-single-date-experience`, `EPIC-pinned-experience-comments` and `EPIC-hero-gallery-display-template` seeds. The full rewrite follows as Stories once the plan is approved.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Factories should serve dev/demo seeds, backend tests and Cypress; confirm whether Cypress resets the DB between specs.
- Is a new package acceptable (e.g. `@faker-js/faker` MIT plus an in-house graph builder)? Recommendation: yes for faker; build the correlation layer in-house on Sequelize models.
- Risk: seeding media through the pipeline needs the r2-local service running during seeding.

## Verification and completion evidence

Spike reproducibility test and association checks against `backend/server/models/index.js`; seeded media visible through the API; plan reviewed by the user.

## Progress and decisions

- 2026-10-26: User broadened scope to a full seeder rewrite plan based on a concept spike.
