---
title: "Remove stay and service cart actions"
work_id: "EPIC-guest-checkout/STORY-004/TASK-002"
work_type: task
template_version: 1
status: in-progress
parent: "EPIC-guest-checkout/STORY-004"
branch: "epic/guest-checkout"
depends_on: [EPIC-guest-checkout/STORY-004/TASK-001]
---

# Remove stay and service cart actions

Parent User Story: [EPIC-guest-checkout/STORY-004](../index.md)

## Overview and acceptance coverage

Completes STORY-004 by removing add-to-cart options for hotel/service while keeping catalog pages browseable.

## Requirements and current state

Cart can be added from ExperienceSessionBookingModal and hotel booking details; service uses equivalent detail components. Keep route browsing and historical reservation pages intact. Cart cleanup notice from backend must be surfaced once to user.

## Implementation steps

1. Remove only cart mutations from stay/service detail views; display cleanup notice from cart API response; verify experience booking modal remains the sole product add action.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/cart/CartModal.jsx | Filter unsupported lines and display backend cleanup notice; remove stay/service add-to-cart actions in minimal detail-page edits. | Avoid unrelated changes to frontend/src/routes/experience-details/** and comments components; hotel/service discovery and past order views remain available. |

## Dependencies

Depends on EPIC-guest-checkout/STORY-004/TASK-001 so UI consumes server cleanup behavior.

## Testing

- Unit: Vitest tests for cleanup notice and supported item rendering.
- Integration: Cypress browse hotel/service pages and verify no cart add action; experience ticket action remains available.
- Manual/UX: Check browsing navigation and historical order details for regressions.
- Regression coverage: Existing HotelDetailsTest.cy.js plus experience add-to-cart.cy.js.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

No new docs required beyond Epic evidence.

## Progress and completion evidence

In progress. Implementation and test evidence will be added before this Task is marked done.

<!-- children:start -->
<!-- children:end -->

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-guest-checkout/STORY-004/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.