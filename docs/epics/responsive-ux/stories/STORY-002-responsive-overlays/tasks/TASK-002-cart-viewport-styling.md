---
title: "Constrain cart and checkout layouts without changing behavior"
work_id: "EPIC-responsive-ux/STORY-002/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-responsive-ux/STORY-002"
branch: "epic/responsive-ux"
depends_on: []
---

# Constrain cart and checkout layouts without changing behavior

Parent User Story: [EPIC-responsive-ux/STORY-002](../index.md)

## Overview and acceptance coverage

Ensure cart and checkout page layout fits narrow and landscape viewports; covers the customer purchase flow criterion.

## Requirements and current state

Cart UI is in frontend/src/components/cart/CartItemCard.jsx, CartFAB.jsx, CartModal.jsx; checkout page and summary are frontend/src/routes/checkout/Checkout.jsx and components/final-booking-summary/FinalBookingSummary.jsx. Other branches own CartContext and cart/checkout logic.

## Implementation steps

1. Use wrapping, min-w-0, responsive grid/flex, and safe-area bottom spacing at presentation-only call sites for cart surface and checkout summary.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/cart/** and frontend/src/routes/checkout/** | CSS/className-only layout constraints and touch target sizing. | No state, context, API, validation, or flow changes; preserve logic from concurrent checkout/cart work. |

## Dependencies

Shared responsive tokens; no behavior dependency.

## Testing

- Unit: Run frontend Vitest suite, especially existing cart/checkout tests.
- Integration: Run read-only checkout/cart viewport checks; avoid submitting live bookings.
- Manual/UX: Check 360x740, 673x841 foldable, 1024x768 landscape, and 1920x1080.
- Regression coverage: Verify totals, quantity controls, and checkout navigation retain existing operation.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Reference the viewport matrix and CSS-only ownership boundary.

## Progress and completion evidence

Completed: cart FAB and item rows wrap on narrow screens with safe-area spacing and 44px action targets. Cart/checkout logic and context were not changed. Production build and all responsive route assertions pass; no cart item was available to exercise the modal flow in Cypress.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-002/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
