---
title: "Enable guest purchase and optional account creation"
work_id: "EPIC-guest-checkout/STORY-002/TASK-002"
work_type: task
template_version: 1
status: in-progress
parent: "EPIC-guest-checkout/STORY-002"
branch: "epic/guest-checkout"
depends_on: [EPIC-guest-checkout/STORY-002/TASK-001]
---

# Enable guest purchase and optional account creation

Parent User Story: [EPIC-guest-checkout/STORY-002](../index.md)

## Overview and acceptance coverage

Completes guest purchase UX while keeping account creation optional and brief.

## Requirements and current state

CartModal.jsx currently blocks checkout unless authenticated; Checkout.jsx already gathers attendee and billing information but booking paths use legacy reservation/payment APIs. Guest cart checkout UI must use the backend guest order contract and present receipt/account options without requiring registration. Provide clear ticket-only scope and receipt continuity.

## Implementation steps

1. Remove login-only gate, submit guest checkout through guest capability API, display confirmation and optional registration affordance; make failures recoverable without discarding cart.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/cart/CartModal.jsx | Allow guest submission and show optional, unobtrusive account action after a successful purchase. | Do not retain payment card data; never put receipt capability into URLs or logs; preserve authenticated checkout and user-supplied billing/attendee details. |

## Dependencies

Depends on EPIC-guest-checkout/STORY-002/TASK-001 guest checkout and receipt API.

## Testing

- Unit: Vitest component tests for guest checkout, optional account action, failure state and authenticated behavior.
- Integration: Cypress component/e2e spec: guest buys experience tickets, receives success confirmation and can proceed without registering.
- Manual/UX: Keyboard and narrow viewport review; verify guest can dismiss account prompt and receipt remains accessible.
- Regression coverage: Existing booking cart-checkout.cy.js and guest-cart.cy.js.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Update app-facing booking guidance only if current docs describe login as mandatory.

## Progress and completion evidence

In progress. Implementation and test evidence will be added before this Task is marked done.

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-guest-checkout/STORY-002/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.