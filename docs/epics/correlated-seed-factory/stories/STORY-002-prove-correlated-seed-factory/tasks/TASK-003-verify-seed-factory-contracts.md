---
title: "Verify determinism associations and overrides"
work_id: "EPIC-correlated-seed-factory/STORY-002/TASK-003"
work_type: task
template_version: 1
status: done
parent: "EPIC-correlated-seed-factory/STORY-002"
branch: "epic/correlated-seed-factory"
depends_on: []
---

# Verify determinism associations and overrides

Parent User Story: [EPIC-correlated-seed-factory/STORY-002](../index.md)

## Overview and acceptance coverage

Add a focused Jest suite proving same-seed identity, required graph relationships, field traits/overrides, store behavior and media persistence seam. This is the spike's executable completion evidence.

## Requirements and current state

Backend Jest uses `backend/jest.config.cjs` and test files under `backend/tests/**/*.test.js`. A unit run must remain pure; tests must never connect to the shared MySQL service or start Docker.

## Implementation steps

1. Write tests for two same-seed graph outputs and schema-reference integrity.
2. Test field traits and overrides, plus memory-store idempotency and cleanup.
3. Stub upload and model update; run the selected Jest file and record exact results.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `backend/tests/seed-factory/seed-factory.test.js` | Five focused behavior tests | Isolated tests only; no DB or service side effects. |
| `backend/server/seed-factory/index.js` | Validation and behaviors under test | Spike-only owned path. |
| `backend/server/seed-factory/media.js` | Media behavior under test | Existing API contract only. |

## Dependencies

Depends on `backend/server/seed-factory/index.js` and `media.js` from the sibling Tasks in this Story. No other Epic branch is needed.

## Testing

- Unit: `npm test -- --runInBand tests/seed-factory/seed-factory.test.js` — 5 passed.
- Integration: Not run; no DB is required by these tests.
- Manual/UX: Not applicable.
- Regression coverage: Existing backend suite not run; focused change does not touch application runtime models or routes.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Recorded the test boundary and non-executed integration checks in this Task and `docs/reference/contracts/seed-factory.md`.

## Progress and completion evidence

Done. Focused command completed successfully with 1 Jest suite and 5 passing tests; shared development database and containers were not used.

## Child work items

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-correlated-seed-factory/STORY-002/TASK-003` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
