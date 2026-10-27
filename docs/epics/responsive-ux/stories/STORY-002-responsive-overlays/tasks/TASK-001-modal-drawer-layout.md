---
title: "Make booking and cart overlays safe-area aware"
work_id: "EPIC-responsive-ux/STORY-002/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-responsive-ux/STORY-002"
branch: "epic/responsive-ux"
depends_on: []
---

# Make booking and cart overlays safe-area aware

Parent User Story: [EPIC-responsive-ux/STORY-002](../index.md)

## Overview and acceptance coverage

Make booking and cart overlays usable within visible viewport and safe areas without altering their behavior.

## Requirements and current state

Booking overlay lives in frontend/src/components/experience-session-booking-modal/ExperienceSessionBookingModal.jsx; cart overlay is frontend/src/components/cart/CartModal.jsx. The hamburger menu is also a fixed overlay. Use dynamic viewport sizing, overflow-y-auto, env(safe-area-inset-*) padding, and minimum 44px close/action targets. Existing menu has a fixed top-16 positioning and overlay backdrop.

## Implementation steps

1. Add shared overlay presentation classes/utilities and apply them to booking and cart surfaces, including scrollable body and inset-aware edges.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/experience-session-booking-modal/** and frontend/src/components/cart/CartModal.jsx | CSS/className-only responsive sizing, scroll region, and safe-area inset treatment. | Do not change event handlers, state, business logic, or modal workflow. |

## Dependencies

Shared safe-area/Tailwind utilities from STORY-001/TASK-001.

## Testing

- Unit: Run relevant booking and cart Vitest tests.
- Integration: Run available booking-modal and cart Cypress tests with non-mutating fixture setup.
- Manual/UX: Check portrait/landscape, 360px width, mobile keyboard visibility, overlay scroll, and close action.
- Regression coverage: Confirm overlay open/close and booking/cart actions behave identically.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Document dynamic viewport and safe-area overlay conventions in the device matrix reference.

## Progress and completion evidence

Completed: booking/cart surfaces use dynamic viewport and safe-area sizing; shared keyboard focus trap, Escape/backdrop dismissal, and focus restoration are implemented. The shared hook unit test and responsive menu keyboard checks pass; cart data was not populated in the read-only browser session.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-002/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
