---
title: "Implement seeded schema-driven graph generation"
work_id: "EPIC-correlated-seed-factory/STORY-002/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-correlated-seed-factory/STORY-002"
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Implement seeded schema-driven graph generation

Parent User Story: [EPIC-correlated-seed-factory/STORY-002](../index.md)

## Overview and acceptance coverage

Implement the declarative, reproducible graph and injectable transactional persistence contract, including seed-scoped skip/replace/cleanup behavior. Covers Story graph and store acceptance criteria.

## Requirements and current state

Use actual Sequelize model names and foreign keys declared in `backend/server/models/index.js`; existing application seeders are not touched. `@faker-js/faker` 9.9.0 is pinned exactly for the spike. The graph generator is pure and can be tested without initializing the MySQL connection.

## Implementation steps

1. Define the graph schema and relationship-reference validation, with explicit seed, fixed clock and bounded count controls.
2. Generate realistic model attributes with injectable trait and field override maps.
3. Add a transactional store interface that inserts dependency order and supports skip/replace and manifest-scoped cleanup.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `backend/server/seed-factory/index.js` | Schema, Faker-backed graph generator, association validator, persistence/cleanup contract | Isolated; no existing seeder edits or database calls. |
| `backend/package.json` | Pin Faker dependency | One dependency added for the isolated spike. |
| `backend/package-lock.json` | Lock Faker dependency | Keep consistent with package manifest. |
| `backend/tests/seed-factory/seed-factory.test.js` | Determinism, refs, overrides and in-memory store checks | Tests do not connect to MySQL. |

## Dependencies

None. Graph records match existing `Organization`, `Location`, `User`, `OrganizationMembers`, `Experience`, `ScheduleTemplate`, `ScheduledExperience`, `TicketTier`, `Order`, `OrderItem`, and `Comment` names.

## Testing

- Unit: Determinism, association references, override behavior, idempotent skip/replace, and explicit cleanup against an in-memory store.
- Integration: Not run; no SQL adapter is included in this concept spike.
- Manual/UX: Inspect generated graph to verify logical keys and timestamps are seed-stable.
- Regression coverage: Existing seeders are unmodified; no shared DB connection is initialized.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

The persistence-store protocol and limitations are specified in `docs/reference/contracts/seed-factory.md`.

## Progress and completion evidence

Done. `npm test -- --runInBand tests/seed-factory/seed-factory.test.js` passes (5 tests). Graph generation and validation are pure; persistence behavior is exercised through a fake store.

## Child work items

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-correlated-seed-factory/STORY-002/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
