---
title: "Choose the seed factory architecture and rewrite path"
work_id: "EPIC-correlated-seed-factory/STORY-001"
work_type: story
template_version: 1
status: done
parent: "EPIC-correlated-seed-factory"
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Choose the seed factory architecture and rewrite path

Parent Epic: [EPIC-correlated-seed-factory](../../index.md)

## User value

As a maintainer, I want one evidence-based factory decision and staged migration plan, so that future seeders and fixtures share a dependable contract without risky one-shot replacement.

## Scope and non-goals

Compare Faker plus an in-house graph layer, a generic factory library, and raw Sequelize seed scripts. Document repository-grounded model links, deterministic inputs, traits/overrides, cleanup/idempotency boundaries, fixture conversion, test integration, migration stages, rollback, and media limitations. Do not edit the existing seeders, apply schema migrations, or rewrite fixtures in this Epic.

## Acceptance criteria

- [x] Given the current model graph and seeders, when maintainers review the contract, then they can see the recommendation, alternatives, assumptions, and staged migration/rollback sequence.
- Epic acceptance coverage: architecture decision and full seeder rewrite plan.

## Ownership and dependencies

Owned file: `docs/reference/contracts/seed-factory.md`. Depends only on the Epic's code inspection; no other Epic branch is required. This is the contract for follow-on single-date, pinned-comment, and hero-gallery seed work.

## Tasks

<!-- children:start -->
- [TASK-001: Document the factory decision and staged rewrite plan](tasks/TASK-001-document-factory-decision-and-rewrite-plan.md)
<!-- children:end -->

## Verification and completion evidence

Contract checked against `backend/server/models/index.js`, the two `backend/server/seeders/*.js` files, media route/controller, `r2-local/src/index.js`, and `frontend/cypress/fixtures/*.json`. References, follow-on boundaries, rollback, and open constraints are documented.

## Progress and decisions

- Done: decision and rewrite contract added; no existing seeder or fixture was changed.
