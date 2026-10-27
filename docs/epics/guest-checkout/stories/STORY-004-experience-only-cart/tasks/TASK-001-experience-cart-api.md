---
title: "Reject non-experience cart items and clean legacy items"
work_id: "EPIC-guest-checkout/STORY-004/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-guest-checkout/STORY-004"
branch: "epic/guest-checkout"
depends_on: []
---

# Reject non-experience cart items and clean legacy items

Parent User Story: [EPIC-guest-checkout/STORY-004](../index.md)

## Overview and acceptance coverage

Implements API half of STORY-004: only scheduled experience tickets enter active carts.

## Requirements and current state

Cart.controller.js currently permits Experience, Service and Hotel, and only validates experience metadata conditionally when present. Cart reads include all CartItems; deleting unsupported legacy rows must recalculate total and preserve an actionable notice for the client. Checkout service currently handles all three types, but new guest checkout will reject unsupported rows.

## Implementation steps

1. Reject Service/Hotel with explicit 400 errors; require scheduled-session metadata and positive ticket selections whose total equals cart quantity on add/update and checkout; clear legacy unsupported cart rows on next read and return a cleanup notice; preserve historical orders and reservations.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/server/controllers/Cart.controller.js | Enforce Experience-only writes and remove legacy Hotel/Service cart lines with totals recomputed and cleanup indicator. | Do not delete historical orders, reservations or models; revalidate ticket quantities before reservation hooks consume scheduled-session availability; cookie ownership stays server-controlled. |

## Dependencies

No prerequisite; this restriction defines valid cart contents for guest checkout.

## Testing

- Unit: Jest controller/service tests for rejected types, malformed experience metadata, legacy cleanup and totals.
- Integration: API tests read legacy cart then verify response notice and subsequent cart contains only experience tickets.
- Manual/UX: Review error wording and ensure old items do not reappear after refresh.
- Regression coverage: Existing add-to-cart and cart checkout API behavior for valid experience items.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Update Epic acceptance/progress with exact deprecated API behavior.

## Progress and completion evidence

Done. Experience-only API validation, legacy cleanup/notice, quantity-matched selections and checkout availability quantity are implemented. Backend cart-controller/checkout-service tests and the full suite pass (34 suites, 330 tests). Historical order readers remain unchanged.

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-guest-checkout/STORY-004/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.