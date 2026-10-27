---
title: "Use booking and cart overlays on touch and desktop"
work_id: "EPIC-responsive-ux/STORY-002"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-responsive-ux"
branch: "epic/responsive-ux"
depends_on: []
---

# Use booking and cart overlays on touch and desktop

Parent Epic: [EPIC-responsive-ux](../../index.md)

## User value

As a a traveler booking an experience, I want use cart and booking overlays on a phone or desktop, so that I can review and complete my choices without the keyboard, safe areas, or viewport clipping hiding controls.

## Scope and non-goals

Style the existing booking modal and cart drawer/modal, cart surface, and checkout layout using dynamic viewport sizing and safe-area padding. Preserve cart, booking, checkout, and data-flow logic; cart and checkout changes are CSS/className-level only. Do not modify the experience-details route logic.

## Acceptance criteria

- [ ] Given I open the booking or cart overlay on a small device or desktop, when I scroll, use its controls, and dismiss it, then the overlay fits the visible viewport, content scrolls within it, touch controls are at least 44px where owned, and close/submit actions are not covered by system insets.
- Epic acceptance coverage: Covers the cart and booking surfaces fitting dynamic viewport height, safe-area support, usable controls, and no horizontal overflow.

## Ownership and dependencies

Owned files are CSS/className-level changes in frontend/src/components/experience-session-booking-modal/**, frontend/src/components/cart/**, and frontend/src/routes/checkout/**. Do not change CartContext or cart/checkout behavior. No comments or experience-details logic.

## Tasks

<!-- children:start -->
- [TASK-001: Make booking and cart overlays safe-area aware](tasks/TASK-001-modal-drawer-layout.md)
- [TASK-002: Constrain cart and checkout layouts without changing behavior](tasks/TASK-002-cart-viewport-styling.md)
<!-- children:end -->

## Verification and completion evidence

Run booking/cart Vitest tests and Cypress booking smoke flows where fixtures and server availability permit; exercise portrait and landscape viewports.

## Progress and decisions

- Draft created; not approved for implementation.