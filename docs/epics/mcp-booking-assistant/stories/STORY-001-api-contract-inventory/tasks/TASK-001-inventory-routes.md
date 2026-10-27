---
title: "Inventory verified REST routes and behavior"
work_id: "EPIC-mcp-booking-assistant/STORY-001/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-mcp-booking-assistant/STORY-001"
branch: "epic/mcp-booking-assistant"
depends_on: []
---

# Inventory verified REST routes and behavior

Parent User Story: [EPIC-mcp-booking-assistant/STORY-001](../index.md)

## Overview and acceptance coverage

Create a source-grounded inventory for the Epic's six target capability groups: login/registration, organization creation/onboarding, org invites, experiences and management, ticket purchase/cart/checkout, and receipt/order lookup. The inventory must distinguish current contracts from unknowns and cover route, controller/service, middleware, payload/response, error handling, limits, and cookie/JWT behavior. This satisfies Story 001's first acceptance criterion and the corresponding Epic criterion.

## Requirements and current state

Routes mount in `backend/server/app.js`; relevant route modules are `users.js`, `organizers.js`, `experiences.js`, `cart.js`, and `orders.js`. Authentication is in `middlewares/auth.js`; CSRF is global in `middlewares/csrf.js`; membership guards are `organization-auth.js` and `experience-auth.js`; rate-limit definitions are in `auth-rate-limit.js` and `rate-limit.js`. No route supports reservation confirmation-code lookup. There is no standalone organization-create route; new organization creation occurs in organizer onboarding completion.

## Implementation steps

1. Trace route registrations to controllers/services and relevant middleware; document verified behavior and unresolved details in `docs/reference/contracts/api/inventory.md`.
2. Verify standard and exceptional response envelopes, rate-limit defaults/keys, auth cookies, JWT expiry, CSRF requirements, and anonymous cart identity against code.
3. Cross-check route names against `server/app.js` mount paths and note the Guest Checkout Epic dependency for receipt claims.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| `docs/reference/contracts/api/inventory.md` | Publish verified API route/behavior inventory | Epic-owned docs only; no production route or contract changes |
| `docs/epics/mcp-booking-assistant/index.md` | Link the inventory and record research progress | Only this Epic folder may be edited; preserve other Epic indexes |

## Child documents

<!-- children:start -->
<!-- children:end -->

## Dependencies

None for source inventory. The Guest Checkout Epic has landed; document its implemented capability receipt and email-verification contracts without inventing confirmation-code lookup.

## Testing

- Unit: Not applicable; documentation task.
- Integration: Verify claims against checked-in route/controller/middleware source; no database required.
- Manual/UX: Review tables for all target capabilities and ensure gaps are labeled.
- Regression coverage: Confirm no backend production source changes are introduced.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

The inventory is the API evidence source for the Story's OpenAPI, test and gap analysis. List endpoint schema details as unknown where code inspection did not establish them.

## Progress and completion evidence

Done: wrote the source-verified route/auth/request/response/error/rate-limit inventory, identified cookie-only auth and the absent confirmation-code lookup contract, and validated planning documents with `node scripts/planning.mjs validate`.

2026-10-27: Refreshed against `routes/cart.js`, `routes/orders.js`, `routes/users.js`, `Cart.controller.js`, `Order.controller.js`, `User.controller.js`, `User.service.js`, and schedule handlers in `Experience.controller.js`. Corrected guest checkout, experience-only cart policy, cookie establishment, receipt capabilities/expiry and verified claims. Recorded GET side effects and non-envelope schedule responses. No production files changed.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-mcp-booking-assistant/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
