---
title: "Document the factory decision and staged rewrite plan"
work_id: "EPIC-correlated-seed-factory/STORY-001/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-correlated-seed-factory/STORY-001"
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Document the factory decision and staged rewrite plan

Parent User Story: [EPIC-correlated-seed-factory/STORY-001](../index.md)

## Overview and acceptance coverage

Create a repository-grounded decision record and a full migration roadmap for current seeders, fixtures, and dependent feature seeds. Covers Story acceptance criterion 1 and Epic architecture/rewrite-plan criteria.

## Requirements and current state

`backend/server/models/index.js` declares organization membership, experience scheduling, tiers, comments, carts/orders and other links. Existing seeders are `20260212222654-startup-org-and-admin.js` (fixed Martin LLC/admin with lookup-and-insert behavior) and `20260214193720-demo-experiences.js` (24 test users, locations and generated experience data using `Math.random()`). Cypress currently carries JSON data at `frontend/cypress/fixtures/{experiences,users,booking,profile}.json`. `backend/server/routes/media.js` and `Media.controller.js` upload images to the R2 worker but return an object descriptor rather than creating a standalone Media row. The schema has no Media model/table; Experience stores media keys in `images`/`thumbnail` columns.

## Implementation steps

1. Compare build/adopt options, choose a seed input/runtime contract, and record licensing/maintenance trade-offs.
2. Inventory existing seeders, Cypress fixtures, models, and dependent feature-seed use cases.
3. Specify phased migration, data ownership, rollback and media constraints without changing the existing seeders.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `docs/reference/contracts/seed-factory.md` | Architecture decision and full rewrite plan | Epic-owned file; do not create a competing section index. |
| `docs/epics/correlated-seed-factory/index.md` | Link completed Story and record Epic in-progress decision | Epic folder only. |
| `docs/epics/correlated-seed-factory/stories/STORY-001-choose-seed-factory-architecture/index.md` | Story scope and completion evidence | Epic folder only. |

## Dependencies

No implementation dependency. Inspect actual models, association declarations, existing seeder behavior, routes, worker and fixtures before making claims.

## Testing

- Unit: Not applicable to prose.
- Integration: Not applicable to prose.
- Manual/UX: Verify links and migration inventory against the checked-in source files.
- Regression coverage: Confirm existing seeders and fixture JSON remain unmodified.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Added `docs/reference/contracts/seed-factory.md` with decision, limitations, phased replacement mapping, migration ordering, rollback and follow-on seed guidance.

## Progress and completion evidence

Done. Inspected both current seeder files, models/index associations, media route/controller, r2-local object API, Cypress fixtures, and test tree. Full contract is in `docs/reference/contracts/seed-factory.md`.

## Child work items

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-correlated-seed-factory/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
