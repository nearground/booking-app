---
title: "Refresh cart after authentication changes"
work_id: "EPIC-guest-checkout/STORY-001/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-guest-checkout/STORY-001"
branch: "epic/guest-checkout"
depends_on: [EPIC-guest-checkout/STORY-001/TASK-001]
---

# Refresh cart after authentication changes

Parent User Story: [EPIC-guest-checkout/STORY-001](../index.md)

## Overview and acceptance coverage

Completes STORY-001 by synchronizing visible cart state with authentication transitions.

## Requirements and current state

CartContext.jsx refreshes when isAuthenticated changes, but refreshCart ignores errors, can leave isLoading stuck on thrown requests, and uses no stale-response guard. Ensure the UI requests the server-owned merged cart after login/logout settles rather than retaining stale guest state; never merge locally or synthesize ownership.

## Implementation steps

1. Harden CartContext refresh lifecycle with finally handling and auth-change refresh sequencing; add focused context tests for login transition and stale responses.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/contexts/CartContext.jsx | Reload server cart after authentication transition and keep loading state consistent on error. | Server is source of truth; do not store cart/session ownership in localStorage. Coordinate with merge endpoint from TASK-001. |

## Dependencies

Depends on EPIC-guest-checkout/STORY-001/TASK-001: server must complete the guest-cart transfer before client refresh.

## Testing

- Unit: Frontend Vitest tests for initial cart load, auth transition refresh, rejection and response ordering.
- Integration: Exercise browser login while guest cart modal is populated; verify cart stays open with merged server data.
- Manual/UX: Refresh page as guest and as signed-in user and verify cookies remain browser-managed.
- Regression coverage: Existing CartContext consumers, add/update/remove/clear actions and cart modal tests.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

No standalone docs; reflect completion evidence in this Task.

## Progress and completion evidence

Done. CartContext uses request sequencing to prevent stale authentication refreshes from overwriting the current cart and always clears loading state. All 3 CartContext Vitest tests pass; full frontend suite passed (255 tests). Cypress login/cart flow is written but unrun against the shared stack.

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-guest-checkout/STORY-001/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.