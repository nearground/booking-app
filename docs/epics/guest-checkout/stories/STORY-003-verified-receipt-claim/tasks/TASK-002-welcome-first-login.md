---
title: "Show claimed receipts and first-login welcome"
work_id: "EPIC-guest-checkout/STORY-003/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-guest-checkout/STORY-003"
branch: "epic/guest-checkout"
depends_on: [EPIC-guest-checkout/STORY-003/TASK-001]
---

# Show claimed receipts and first-login welcome

Parent User Story: [EPIC-guest-checkout/STORY-003](../index.md)

## Overview and acceptance coverage

Completes STORY-003(b): registering during checkout offers first-login welcome and accessible receipts.

## Requirements and current state

User profile data is returned by User.controller.getUser; orders list is authenticated at /api/orders. No first-login marker or welcome UX currently exists. Checkout-time registration uses the same verified email workflow; account claims remain blocked until verification succeeds. Verification links carry only the single-use token; receipt capabilities and passwords are never placed in URLs.

## Implementation steps

1. After guest checkout, expose compact create-account form/entry with receipt email prefilled; on registration show verify-email next step; detect first authenticated session with newly claimed orders and show a one-time Welcome message/link to account orders.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/routes/checkout/Checkout.jsx | Offer optional account creation after booking and show verification/welcome state without blocking receipt confirmation. | Passwords and receipt capabilities never appear in URLs; the verification link carries a single-use, expiring token. Keep registration contract and first-login UI informational; receipt ownership remains server-authorized. |

## Dependencies

Depends on EPIC-guest-checkout/STORY-003/TASK-001 verified claim workflow.

## Testing

- Unit: Vitest tests for optional registration visibility, verification-pending state and welcome shown only once.
- Integration: Cypress flow registers during checkout, verifies email in test harness, logs in, sees order in account panel and first-login welcome.
- Manual/UX: Complete checkout without account and with account separately; account creation must be skippable.
- Regression coverage: Existing register/login/profile route tests and confirmation experience.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Update account/receipt UI documentation only where relevant.

## Progress and completion evidence

Done. Optional registration, email verification, claimed-order visibility and first-login Welcome are implemented and covered by frontend tests. Full frontend suite passed; the Cypress end-to-end path is written but unrun because it requires the prohibited shared stack.

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-guest-checkout/STORY-003/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.