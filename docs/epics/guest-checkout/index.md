---
title: "Guest-first checkout and cart continuity"
work_id: "EPIC-guest-checkout"
work_type: epic
template_version: 1
status: in-progress
parent: null
branch: "epic/guest-checkout"
depends_on: []
---

# Guest-first checkout and cart continuity

## Outcome and MVP traceability

Guests can preserve selected cart contents through login and complete supported checkout without account creation; a brief account benefit remains optional. This addresses the reported cart loss on login.

## Scope and non-goals

In scope: guest-to-account cart association, checkout without login, short optional registration benefit, and automated regression tests. Current code: `frontend/src/contexts/CartContext.jsx`, `components/cart/`, `routes/checkout/Checkout.jsx`, `backend/server/controllers/Cart.controller.js`, `models/Cart.model.js`, `controllers/Order.controller.js`. Existing Cypress specs: `frontend/cypress/e2e/booking/guest-cart.cy.js`, `cart-checkout.cy.js`; backend `tests/unit/checkout-service.test.js`. Out of scope: new payment providers or unrelated pricing changes.

Decision (user, 2026-10-26): the cart and checkout cover **experience tickets only**; cart support for stays (hotels) and services is deprecated. The cart API rejects new non-experience items with a clear error, the UI no longer offers "add to cart" for them, and existing non-experience cart items are removed with a notice on next load. Historical orders/receipts for those types stay readable; their models and routes are not deleted in this Epic.

## Acceptance criteria

- [x] Existing guest cart items remain after login without loss or duplication; availability and ticket selections are revalidated.
- [x] Guest can complete supported checkout without login; session/cart cookies remain server-controlled.
- [x] Account benefit is short and unobtrusive; account creation is optional.
- [x] Both account options are offered to the guest: (a) finish the account later — registering with the receipt's email transfers receipt ownership via a verified claim (email verification), and (b) register during checkout, then view the receipt in the logged-in account bookings panel with a first-login Welcome UX.
- [x] Automated tests cover guest cart, login continuity/merge, purchase, both account routes, receipt access, invalid claims and duplicate behavior.
- [x] Cart accepts experience tickets only; adding stays/services is rejected by the API and not offered in the UI; legacy non-experience cart items are cleared with a notice; past orders of those types remain viewable.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/contexts/CartContext.jsx`; `frontend/src/components/cart/**`; `frontend/src/routes/checkout/**`; `backend/server/controllers/Cart.controller.js`, `Order.controller.js`; only required cart/order services/models; booking Cypress specs and focused backend tests.
- Shared files/contracts and owner: This Epic owns guest-to-account cart merge and receipt claim/ownership contract, including required schema changes folded into the existing baseline migration; no standalone migration file is added. No arbitrary receipt email is proof of ownership; use verified secure claim. Other Epics consume, not redefine, this API.
- Parallel-ready assessment: Parallel-ready from the confirmed common baseline; independent of details-page Epics.

## Dependencies and integration

No prerequisite. The MCP API research Epic documents this Epic's receipt claim/lookup contract once published. Stay/service add-to-cart entry points (hotel and service detail pages) get minimal edits only to remove the cart action.

## User Stories

The Epic was expanded into four stories covering cart continuity, guest purchase, verified receipt claiming, and experience-only cart policy.

<!-- children:start -->
- [STORY-001: Keep guest experience carts through login](stories/STORY-001-cart-continuity/index.md)
- [STORY-002: Complete experience checkout as a guest](stories/STORY-002-guest-purchase/index.md)
- [STORY-003: Claim guest receipts through verified accounts](stories/STORY-003-verified-receipt-claim/index.md)
- [STORY-004: Limit carts to experience tickets](stories/STORY-004-experience-only-cart/index.md)
<!-- children:end -->

## Risks, assumptions and open questions

- Both account paths are required. Assumption: the deferred path transfers receipt ownership only after the registering user verifies the receipt email; email equality alone is insufficient.
- Decided: experience tickets only; stays/services cart support deprecated.
- Should stays/services pages be hidden entirely, or remain browsable without booking? Assumption for now: remain browsable, cart action removed.
- Decided: guest receipt claims require verified email ownership; guest capability access expires after 30 days.
- Assumption: existing payment/checkout is usable; payment integration is not redesigned.

## Verification and completion evidence

Backend validation: 30 Jest suites / 280 tests passed. Frontend full Vitest suite passed (31 files, 234 tests). Cypress guest checkout/account-flow specs are written but not run because they require the shared Docker/database stack, which this Epic must not operate. No standalone migration was added: EmailVerificationTokens is included in the existing baseline schema; ephemeral verification tokens are not seeded.

## Progress and decisions

- Implementation is complete on `epic/guest-checkout`; all eight Tasks are marked done. Secure receipt claiming uses hashed, purpose-specific verification tokens. The existing baseline migration defines the token table for fresh databases; verification tokens are not demo-seeded. End-to-end tests remain unrun by design because they depend on the shared Docker/database stack.
