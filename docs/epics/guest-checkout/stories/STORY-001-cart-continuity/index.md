---
title: "Keep guest experience carts through login"
work_id: "EPIC-guest-checkout/STORY-001"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-guest-checkout"
branch: "epic/guest-checkout"
depends_on: []
---

# Keep guest experience carts through login

Parent Epic: [EPIC-guest-checkout](../../index.md)

## User value

As a guest shopper, I want keep experience-ticket selections when signing in, so that I can finish checkout without rebuilding my cart.

## Scope and non-goals

Merge the cookie-owned guest cart into the authenticated CustomerId cart during login; retain all distinct experience selections, consolidate identical selections deterministically, clear guest ownership after success, and reload cart state after authentication changes. Stays and services are excluded by the separate experience-only story.

## Acceptance criteria

- [ ] Given a guest has one or more experience-ticket lines and an authenticated cart may already exist, when the guest logs in, then the resulting authenticated cart contains every distinct selection exactly once, with correct quantities and totals, and the guest cart cannot be merged again.
- Epic acceptance coverage: guest-to-account cart association and merge without loss or duplicate lines; availability and ticket choices remain subject to server validation at checkout

## Ownership and dependencies

This story owns Cart.controller.js, cart merge logic/model associations as needed, the login handoff in User.controller.js, CartContext.jsx, and backend/frontend regression tests. No other branch may redefine the merge contract.

## Tasks

<!-- children:start -->
- [TASK-001: Merge guest cart into the authenticated cart](tasks/TASK-001-merge-cart.md)
- [TASK-002: Refresh cart after authentication changes](tasks/TASK-002-cart-auth-refresh.md)
<!-- children:end -->

## Verification and completion evidence

Backend tests cover no guest cart, no existing account cart, both carts, repeated login/idempotency, exact duplicate selections, distinct ticket selections, totals, and non-experience cleanup. Frontend tests verify refresh after auth transitions.

## Progress and decisions

- In progress; implementation and focused regression tests are underway.