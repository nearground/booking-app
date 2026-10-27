---
title: "Specify target routes and detect route drift"
work_id: "EPIC-mcp-booking-assistant/STORY-001/TASK-002"
work_type: task
template_version: 1
status: in-progress
parent: "EPIC-mcp-booking-assistant/STORY-001"
branch: "epic/mcp-booking-assistant"
depends_on: []
---

# Specify target routes and detect route drift

Parent User Story: [EPIC-mcp-booking-assistant/STORY-001](../index.md)

## Overview and acceptance coverage

Publish a machine-readable OpenAPI subset for the selected booking routes and a Jest contract test that checks method/path definitions against route source without importing the Express app or connecting to a database. This covers Story 001's route-drift acceptance criterion and the Epic's OpenAPI acceptance criterion.

## Requirements and current state

Backend routes are Express routers mounted by `server/app.js`. The backend Jest setup supports JavaScript tests under `backend/tests/**/*.test.js`. To remain DB-independent, inspect router source registrations as text; do not require route/controller modules with model initialization. `openapi.yaml` must accurately distinguish cookie authentication and explicitly describe incomplete schemas/unknowns. It may use the JSON subset of YAML to permit native JSON parsing without adding a parser dependency.

## Implementation steps

1. Describe current target operations and known request/response schemas in `docs/reference/contracts/api/openapi.yaml`.
2. Add a Jest test that checks the explicit target operation set in the spec and compares each operation to method/path registrations in the corresponding router source.
3. Confirm tests work without requiring an active database; do not start a development stack or perform writes against it.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `docs/reference/contracts/api/openapi.yaml` | Machine-readable target-route specification | Research-only; unknown schemas labeled; no invented guest lookup route |
| `backend/tests/api-openapi-contract.test.js` | DB-free Jest route/method drift test | Test-only; parse files, do not import app/models or use external API writes |
| `docs/epics/mcp-booking-assistant/index.md` | Link spec/test and record verification | Only this Epic folder may be edited |

## Child documents

<!-- children:start -->
<!-- children:end -->

## Dependencies

No code dependencies. Builds on route facts in Story 001/TASK-001; refresh inventory and spec after future REST contract changes.

## Testing

- Unit: Run `npx jest tests/api-openapi-contract.test.js --runInBand` from `backend`.
- Integration: Not required; optionally a read-only GET smoke may be skipped if localhost:4000 is unreachable.
- Manual/UX: Inspect OpenAPI paths and auth/request schemas for consistency with `inventory.md`.
- Regression coverage: Run full backend Jest suite; ensure the new test does not import DB modules.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Keep OpenAPI route coverage synchronized with inventory and current router registrations; expose known constraints but never imply the OpenAPI subset is the complete backend API.

## Progress and completion evidence

In progress; complete after focused and full Jest runs and static validation of the spec.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-mcp-booking-assistant/STORY-001/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
