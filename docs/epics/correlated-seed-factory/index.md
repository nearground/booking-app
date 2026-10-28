---
title: "Correlated seed factory spike and seeder rewrite plan"
work_id: "EPIC-correlated-seed-factory"
work_type: epic
template_version: 1
status: done
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
- Actual media upload requires r2-local and an authenticated `_token` cookie. The app has no standalone Media table; references remain in `Experience.images`. The subsequent rework adds durable SQL/media ownership without introducing a new application Media entity.

## Verification and completion evidence

Original Wave 1 evidence: spike reproducibility and schema-reference checks grounded in `backend/server/models/index.js`, with a stub-tested media adapter. SQL and actual media verification were deferred at that point; the subsequent rework below now exercises both.

### Subsequently authorized full rework

The user subsequently approved completing the full development/test rewrite. The legacy seeder bodies are now replaced by factory entry points. A durable Sequelize store records exact ownership/digests, serializes writers, and implements transactional skip/replace/cleanup with external-reference protection. Named startup/demo scenarios preserve the public examples and use configured credentials. Cypress resets now require a disposable test database and share the factory catalog.

Real authenticated PNG/MP4 upload and storage deletion are exercised with pre-upload journaling, rollback compensation and retryable cleanup. The local worker's MIME allowlist now matches Express for MP4. No production data, DNS/tunnel activation or new migration is involved. See the [current factory contract and commands](../../reference/contracts/seed-factory.md); the original Wave 1 research acceptance above remains historical.

## Progress and decisions

- 2026-10-26: User broadened scope to a full seeder rewrite plan based on a concept spike.
- Wave 1 closeout: all scoped research/spike deliverables are complete and merged. The full seeder rewrite and durable SQL adapter are explicitly non-goals of this Epic, not unfinished Wave 1 implementation; they remain follow-on work under the published plan.
- Spike verification: `backend/tests/seed-factory/seed-factory.test.js` passes (5 tests). Actual media upload and SQL materialization are not run; see contract limitations.
- 2026-10-28 showcase follow-up: prioritize the existing demo seed's three organization cases ahead of a general seeder rewrite. Delivery order is the hero Epic's metadata contract, parallel event/food/default renderers, then correlated media and seed integration. The full factory rewrite remains separate; it is not a prerequisite for this bounded showcase.
- The demo graph now assigns `testcompany1` a free and a paid-admission single-occurrence private-venue event, `testcompany2` the food tour with three specifically pinned five-star reviews and a video/poster, and `testcompany3` the default coastal experience with uploaded gallery photos. Existing seeded experience identities are retained when event titles change. Event examples include three consenting registered guests per event; guest identities are not inferred from billing details.
- Verification: parent-owned seed regression suites pass (2 suites, 6 tests), covering organization preferences, uploaded-key persistence, review association, zero-price tiers, one event session, consent answers and remaining capacity. These are mocked SQL/storage contract tests, not evidence that a live database or R2 bucket has been populated.
- Security review: changed files passed secret scanning. The JavaScript CodeQL pass reported three reviewed false positives: two React image `src` bindings (escaped DOM properties, not HTML parsing; the food poster additionally passes URL validation) and upload `bytes.length` (guarded by `Buffer.isBuffer` in both the HTTP controller and shared storage service). No executable HTML is introduced by these paths.
- Integration follow-up: the upstream showcase implementation is integrated with
  the authorized durable factory rewrite. At the user's request, the original
  generic demos are retained and `showcase` adds three extra organizations at
  `/o/house-party`, `/o/food-tours`, and `/o/default-tours`, with a separate
  ownership manifest and journaled real media uploads. The earlier
  `testcompany1`/`testcompany2`/`testcompany3` showcase assignment above describes
  the upstream implementation before this additive integration.
