---
title: "Prove deterministic correlated graph generation"
work_id: "EPIC-correlated-seed-factory/STORY-002"
work_type: story
template_version: 1
status: done
parent: "EPIC-correlated-seed-factory"
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Prove deterministic correlated graph generation

Parent Epic: [EPIC-correlated-seed-factory](../../index.md)

## User value

As a developer, I want a runnable, isolated example of seeded correlated records and a media pipeline seam, so that the future rewrite can be validated without altering deployed seeders or requiring the shared development database.

## Scope and non-goals

Add a pure graph generator and injectable persistence/media contracts under `backend/server/seed-factory/`. Cover the Organization → members → experiences → schedules/sessions → ticket tiers → orders → comments graph; exercise deterministic seed, count overrides, traits, idempotent replacement and exact cleanup in tests. Media is uploaded via the authenticated production API route and recorded in the existing Experience `images` JSON column. Do not execute against MySQL/R2, edit current seeders, or add schema migrations.

## Acceptance criteria

- [x] Given an explicit seed, when the generator runs twice, then the normalized graph and all associations are identical and valid.
- [x] Given traits, count settings, and field overrides, when generation runs, then requested attributes/counts are honored.
- [x] Given a persistence store, when a seed repeats or is cleaned, then skip/replace/cleanup are scoped to that seed manifest.
- [x] Given an uploaded media response, when attached to a persisted experience, then its object key is appended as a string in the existing `Experience.images` format; the API adapter uses `/api/media/upload` and has a stub test.
- Epic acceptance coverage: deterministic graph, association validity, media pipeline seam, idempotency and cleanup.

## Ownership and dependencies

Owned implementation paths: `backend/server/seed-factory/**` and `backend/tests/seed-factory/**`; the Epic branch owns the generator/API contract. Uses existing Sequelize model names and associations from `backend/server/models/index.js`. No migration or existing-seeder change.

## Tasks

<!-- children:start -->
- [TASK-001: Implement seeded schema-driven graph generation](tasks/TASK-001-implement-schema-driven-graph-generator.md)
- [TASK-002: Add media pipeline adapter and stub verification](tasks/TASK-002-integrate-media-pipeline-adapter.md)
- [TASK-003: Verify determinism associations and overrides](tasks/TASK-003-verify-seed-factory-contracts.md)
<!-- children:end -->

## Verification and completion evidence

`npm test -- --runInBand tests/seed-factory/seed-factory.test.js` passes all 5 tests. Tests use pure graph generation, an in-memory store contract and stubbed authenticated upload/persist interfaces. No real DB, media API, R2 object store or Cypress tests are exercised.

## Progress and decisions

- Done: isolated spike and focused tests delivered; production Sequelize persistence remains a follow-on adapter using the documented manifest contract.
