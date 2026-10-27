---
title: "Complete experience checkout as a guest"
work_id: "EPIC-guest-checkout/STORY-002"
work_type: story
template_version: 1
status: done
parent: "EPIC-guest-checkout"
branch: "epic/guest-checkout"
depends_on: []
---

# Complete experience checkout as a guest

Parent Epic: [EPIC-guest-checkout](../../index.md)

## User value

As a guest shopper, I want buy selected experience tickets without creating an account, so that I can complete booking with only the information needed for the reservation.

## Scope and non-goals

Allow cookie-owned guest cart checkout, server-controlled order/receipt access, and an optional low-friction account path. Guest bookings retain attendee and billing details and continue through the existing reservation/payment flow; hotels and services are not accepted.

## Acceptance criteria

- [x] Given a guest has a valid experience-ticket cart and supplies required attendee and billing information, when the guest submits checkout, then the backend creates the reservation and order without requiring req.user, and returns a receipt capability that can retrieve only that order.
- Epic acceptance coverage: checkout works without login while cookies remain server controlled; receipt access is secure; registration is optional and unobtrusive

## Ownership and dependencies

This story owns guest authorization in cart/order routes, Checkout.service.js and Order.controller.js guest receipt capability, Checkout.jsx / CartModal.jsx entry points, and focused tests. Capability tokens must be random, stored only as a hash, and never permit enumeration.

## Tasks

<!-- children:start -->
- [TASK-001: Create and retrieve guest experience orders securely](tasks/TASK-001-guest-order.md)
- [TASK-002: Enable guest purchase and optional account creation](tasks/TASK-002-guest-checkout-ui.md)
<!-- children:end -->

## Verification and completion evidence

Backend tests cover guest and authenticated order creation, cart ownership, receipt token authorization, tampered/expired capabilities, and existing authenticated order access. Frontend tests cover guest checkout affordance, optional registration choices, and receipt navigation.

## Progress and decisions

- Done. Guest checkout is bound to the HTTP-only session cookie and uses hashed, expiring receipt capabilities. The receipt screen offers optional registration. Backend/frontend full suites passed; focused guest receipt and CartModal tests pass. Cypress guest checkout E2E is written but not run against the shared stack.