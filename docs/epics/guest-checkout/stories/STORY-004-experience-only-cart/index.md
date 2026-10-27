---
title: "Limit carts to experience tickets"
work_id: "EPIC-guest-checkout/STORY-004"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-guest-checkout"
branch: "epic/guest-checkout"
depends_on: []
---

# Limit carts to experience tickets

Parent Epic: [EPIC-guest-checkout](../../index.md)

## User value

As a shopper browsing the catalog, I want use a cart only for experience tickets while continuing to browse stays and services, so that cart checkout stays consistent and unsupported items are clearly explained.

## Scope and non-goals

Restrict cart API writes to valid Experience items with scheduled experience and ticket selections; remove Hotel/Service cart actions; remove legacy non-experience lines with one user-visible notice on next cart load. Keep hotel/service pages and historical order/reservation views available.

## Acceptance criteria

- [ ] Given an existing cart has legacy Hotel or Service rows or a shopper is viewing a stay/service page, when the cart loads or the shopper attempts an unsupported add, then legacy rows are deleted and totals recalculated with a notice, API add/update rejects unsupported types, and no UI cart action is offered while detail pages remain browsable.
- Epic acceptance coverage: only experience ticket items are accepted; old stay/service cart items are removed with notice; historical non-experience orders remain viewable

## Ownership and dependencies

This story owns Cart.controller.js and cart UI consumers. Touch hotel/service page components only to remove their add-to-cart action; preserve browsing and historical reservation models/routes.

## Tasks

<!-- children:start -->
- [TASK-001: Reject non-experience cart items and clean legacy items](tasks/TASK-001-experience-cart-api.md)
- [TASK-002: Remove stay and service cart actions](tasks/TASK-002-experience-cart-ui.md)
<!-- children:end -->

## Verification and completion evidence

Backend tests reject Service/Hotel writes and clean old rows/totals; frontend tests verify warning, retained experience rows and absence of stay/service cart actions. Existing order/reservation read routes must remain unchanged.

## Progress and decisions

- In progress; implementation and focused regression tests are underway.