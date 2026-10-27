---
title: "Verify responsive layouts across the supported device matrix"
work_id: "EPIC-responsive-ux/STORY-003"
work_type: story
template_version: 1
status: in-progress
parent: "EPIC-responsive-ux"
branch: "epic/responsive-ux"
depends_on: []
---

# Verify responsive layouts across the supported device matrix

Parent Epic: [EPIC-responsive-ux](../../index.md)

## User value

As a a product team member validating responsive behavior, I want run one repeatable viewport check across key customer routes and device shapes, so that layout regressions are detected before release instead of being found on a phone.

## Scope and non-goals

Document the target viewport matrix and add Cypress e2e assertions for horizontal overflow and route-specific key controls. The spec is read-only and should work with the app server configured by Cypress; do not couple it to live booking writes.

## Acceptance criteria

- [ ] Given I run the responsive e2e spec against an available app server, when the spec visits customer routes across the documented viewport matrix, then every route has no document-level horizontal overflow and its primary route controls are visible.
- Epic acceptance coverage: Covers device matrix documentation and automated checks for home, browse, details, cart, checkout, receipt, login/register, and organizer profile.

## Ownership and dependencies

Owned paths: docs/reference/responsive-device-matrix.md and frontend/cypress/e2e/responsive/**. Read-only route assertions; no changes to route business logic. Route pages modified by concurrent branches must be covered without editing their protected source files.

## Tasks

<!-- children:start -->
- [TASK-001: Document supported viewport and orientation coverage](tasks/TASK-001-device-matrix.md)
- [TASK-002: Assert responsive route controls and overflow in Cypress](tasks/TASK-002-cypress-viewport-check.md)
<!-- children:end -->

## Verification and completion evidence

Run the new Cypress viewport spec against localhost:8080 only as a main-branch baseline if baseUrl permits; otherwise run against the worktree Vite server and document server dependencies.

## Progress and decisions

- Draft created; not approved for implementation.