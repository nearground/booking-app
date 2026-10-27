---
title: "Merge guest cart into the authenticated cart"
work_id: "EPIC-guest-checkout/STORY-001/TASK-001"
work_type: task
template_version: 1
status: in-progress
parent: "EPIC-guest-checkout/STORY-001"
branch: "epic/guest-checkout"
depends_on: []
---

# Merge guest cart into the authenticated cart

Parent User Story: [EPIC-guest-checkout/STORY-001](../index.md)

## Overview and acceptance coverage

Implements STORY-001 and Epic criterion 1: retain guest selections at login without creating duplicate lines.

## Requirements and current state

Cart.controller.js currently selects carts exclusively by CustomerId for authenticated requests, while a guest cart is keyed by the _cart_session cookie. User.controller.js login issues the JWT but never transfers the cookie-owned cart. CartItem rows store ProductType, ProductId, quantity and selection metadata. Merge must be transactional and repeat-safe, preserve distinct ticket selections, recompute totals, and clear guest session ownership only after transfer. Use the existing secure cookie and JWT behavior unchanged.

## Implementation steps

1. Add a transactional cart merge service invoked after credential validation on login; test same-selection coalescing versus distinct ticket lines, ownership reset, total recomputation and retry safety.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/server/controllers/Cart.controller.js | Extract and expose an idempotent guest-to-user merge operation, consolidating canonical-identical experience lines and recalculating totals. | Preserve _cart_session cookie attributes, CSRF checks and existing authenticated cart ownership; do not merge orders or trust client-supplied user IDs. |

## Dependencies

No prerequisite; merge contract and login handoff are owned by this Task.

## Testing

- Unit: Focused Jest tests for cart merge service behavior, duplicate equivalence, distinct selections and recalculated totals.
- Integration: Login with guest and account carts; verify authenticated GET returns merged cart and second login does not duplicate.
- Manual/UX: Use guest session to add ticket selections, log in, inspect cart count, quantities, choices and totals.
- Regression coverage: Existing cart endpoint and auth/login tests; validate merge under missing cart and stale cookie.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Document merge behavior and any migration/API contract in the owning Epic notes only.

## Progress and completion evidence

In progress. Implementation and test evidence will be added before this Task is marked done.

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-guest-checkout/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.