---
title: "Guest-first checkout and cart continuity"
work_id: "EPIC-guest-checkout"
work_type: epic
template_version: 1
status: draft
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

- [ ] Existing guest cart items remain after login without loss or duplication; availability and ticket selections are revalidated.
- [ ] Guest can complete supported checkout without login; session/cart cookies remain server-controlled.
- [ ] Account benefit is short and unobtrusive; account creation is optional.
- [ ] Both account options are offered to the guest: (a) finish the account later — registering with the receipt's email transfers receipt ownership via a verified claim (email verification), and (b) register during checkout, then view the receipt in the logged-in admin panel with a first-login Welcome UX.
- [ ] Automated tests cover guest cart, login continuity/merge, purchase, both account routes, receipt access, invalid claims and duplicate behavior.
- [ ] Cart accepts experience tickets only; adding stays/services is rejected by the API and not offered in the UI; legacy non-experience cart items are cleared with a notice; past orders of those types remain viewable.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/contexts/CartContext.jsx`; `frontend/src/components/cart/**`; `frontend/src/routes/checkout/**`; `backend/server/controllers/Cart.controller.js`, `Order.controller.js`; only required cart/order services/models; booking Cypress specs and focused backend tests.
- Shared files/contracts and owner: This Epic owns guest-to-account cart merge and receipt claim/ownership contract, including any schema migration. No arbitrary receipt email is proof of ownership; use verified secure claim. Other Epics consume, not redefine, this API.
- Parallel-ready assessment: Parallel-ready from the confirmed common baseline; independent of details-page Epics.

## Dependencies and integration

No prerequisite. The MCP API research Epic documents this Epic's receipt claim/lookup contract once published. Stay/service add-to-cart entry points (hotel and service detail pages) get minimal edits only to remove the cart action.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Both account paths are required. Assumption: the deferred path transfers receipt ownership only after the registering user verifies the receipt email; email equality alone is insufficient.
- Decided: experience tickets only; stays/services cart support deprecated.
- Should stays/services pages be hidden entirely, or remain browsable without booking? Assumption for now: remain browsable, cart action removed.
- Should receipt access wait for email verification?
- Assumption: existing payment/checkout is usable; payment integration is not redesigned.

## Verification and completion evidence

Run existing booking Cypress specs and backend checkout tests; add automated guest purchase, login/cart merge and authorization/receipt-claim regression coverage before completion.

## Progress and decisions

- Draft created; not approved for implementation. Open decisions remain; no implementation evidence recorded.
