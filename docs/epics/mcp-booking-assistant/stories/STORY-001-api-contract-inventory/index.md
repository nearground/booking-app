---
title: "Understand the existing booking API contracts"
work_id: "EPIC-mcp-booking-assistant/STORY-001"
work_type: story
template_version: 1
status: done
parent: "EPIC-mcp-booking-assistant"
branch: "epic/mcp-booking-assistant"
depends_on: []
---

# Understand the existing booking API contracts

Parent Epic: [EPIC-mcp-booking-assistant](../../index.md)

## User value

As a future MCP integrator, I want a verified route and contract map for booking capabilities, so that I can scope client tools without relying on assumptions or changing production behavior.

## Scope and non-goals

Document the existing registration/login, organizer onboarding and invites, experience discovery/management/reservations, cart/checkout, and order-confirmation routes. Include route ownership, auth and CSRF middleware, inputs and outputs, error format, rate limits, cookie/JWT behavior, and explicitly unresolved schemas. Publish the scoped OpenAPI document and a database-free route/method drift test. Do not change backend route behavior or add an MCP server.

## Acceptance criteria

- [x] Given a future client integrator, when they review the inventory, then every target capability has its current route, handler/service, authorization, request/response, error and rate-limit details where verified, with unknowns called out.
- [x] Given a change to an OpenAPI target route or method, when the contract test runs, then it detects mismatch with the Express route registrations without initializing the database.
- [x] Epic acceptance coverage: verified route/auth/input/output/error inventory and an OpenAPI specification with automated route-drift coverage.

## Ownership and dependencies

Owned files are `docs/reference/contracts/api/inventory.md`, `docs/reference/contracts/api/openapi.yaml`, and `backend/tests/api-openapi-contract.test.js`. The backend route owners remain authoritative; this Story documents existing behavior and must not edit production behavior. No prerequisite; guest receipt claims remain outside scope until the Guest Checkout Epic lands.

## Tasks

<!-- children:start -->
- [TASK-001: Inventory verified REST routes and behavior](tasks/TASK-001-inventory-routes.md)
- [TASK-002: Specify target routes and detect route drift](tasks/TASK-002-openapi-contract-check.md)
<!-- children:end -->

## Verification and completion evidence

Verified `node scripts/planning.mjs validate`; the DB-free route test and full backend Jest suite passed (27 suites, 265 tests). The test inspects route source without importing the Express app or database. No API smoke was needed.

## Progress and decisions

- Expanded from the API research Epic; route and auth facts are being verified against backend source.
