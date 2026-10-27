---
title: "Correlated seed factory spike"
work_id: "EPIC-correlated-seed-factory"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Correlated seed factory spike

## Outcome and MVP traceability

An evidence-based decision describes a repeatable way to generate multiple correlated records from a schema and provides a bounded prototype scope.

## Scope and non-goals

Research/design Epic, not a full seeder rewrite. Current seeders: `backend/server/seeders/20260212222654-startup-org-and-admin.js` and `20260214193720-demo-experiences.js`; demo data uses inline random helpers. Compare schema-driven in-house factory with appropriate third-party JavaScript/Sequelize factory libraries. Document correlated associations, determinism, override/traits, idempotency, cleanup, migrations, tests, maintenance, dependencies and licensing. Prototype scope may cover an organization?experience?schedule/session?ticket tier graph and must remain isolated; no production DB schema changes or bulk seeder rewrite.

## Acceptance criteria

- [ ] Decision/design doc compares adopt/build/defer alternatives against repository constraints, maintenance and licensing.
- [ ] Recommendation specifies schema/input format, correlated relationships, reproducibility, overrides and known limitations.
- [ ] Bounded prototype plan names target models, outputs, entrypoint, test strategy and acceptance measures; any prototype is isolated and repeatably generates valid related records.
- [ ] Documented contract enables feature examples without imposing unapproved library/format on other branches.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `docs/reference/**` or a dedicated seed decision doc; optional isolated prototype under an agreed backend test/seeder subpath. No broad existing seeder edits without approval.
- Shared files/contracts and owner: This Epic owns seed-factory decision and prototype contract. Epics 3/4/5 consume the approved approach only after publication. Do not mutate production schema.
- Parallel-ready assessment: Parallel-ready research spike on baseline; shared seeders are integration-sensitive, so any code prototype must stay isolated.

## Dependencies and integration

Requested prerequisite for Epics `EPIC-single-date-experience`, `EPIC-pinned-experience-comments`, and `EPIC-hero-gallery-display-template`; no dependency for unrelated Epics.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Will factories serve Cypress only, backend tests, dev/demo seeds, or all?
- Is a new package acceptable; which licensing/security constraints apply?
- Should randomness be fixed per fixture or permitted with an explicit seed?
- Assumption: current migration seeders remain supported and are not replaced wholesale.

## Verification and completion evidence

Review against seeders, model associations in `backend/server/models/index.js` and Cypress DB seeding. Prototype checks same-seed reproducibility and valid related records.

## Progress and decisions

- Draft created; not approved for implementation. Open decisions remain; no implementation evidence recorded.
