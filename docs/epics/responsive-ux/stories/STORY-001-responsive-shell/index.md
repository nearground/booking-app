---
title: "Navigate and browse comfortably at every viewport"
work_id: "EPIC-responsive-ux/STORY-001"
work_type: story
template_version: 1
status: done
parent: "EPIC-responsive-ux"
branch: "epic/responsive-ux"
depends_on: []
---

# Navigate and browse comfortably at every viewport

Parent Epic: [EPIC-responsive-ux](../../index.md)

## User value

As a a traveler, I want navigate and browse on any supported screen size, so that I can find experiences without clipped navigation or unreadable layouts.

## Scope and non-goals

Align the Tailwind theme and shared page containers, improve the global navbar/menu and footer, and use stable responsive media boxes where current components display images. Reserve an accessible, fixed-width-flexible slot in the navbar for the future EN|ES switcher; do not implement localization. Do not change experience-details behavior or organizer page logic.

## Acceptance criteria

- [x] Given I am using a narrow phone, tablet, laptop, or wide desktop, when I open the home, experience browse, login, or organizer profile route and use shared navigation, then content fits the viewport, primary controls remain visible and operable, and keyboard focus is visible.
- Epic acceptance coverage: Covers supported viewport matrix documentation, shared layout, navbar/footer, global focus/touch behavior, and image space reservation.

## Ownership and dependencies

Owned paths: frontend/tailwind.config.js, frontend/src/index.scss, frontend/src/components/global-navbar/**, frontend/src/components/hamburger-menu/**, frontend/src/components/global-footer/**, and directly related shared layout CSS. Avoid comments and experience-details logic. No dependency on other Epic branches.

## Tasks

<!-- children:start -->
- [TASK-001: Define responsive breakpoints and rebuild the shared shell](tasks/TASK-001-breakpoints-shell.md)
- [TASK-002: Stabilize responsive media and common page containers](tasks/TASK-002-media-layout.md)
<!-- children:end -->

## Verification and completion evidence

Run the responsive Cypress spec for home, browse, login/register, and organizer profile at matrix viewports; run existing Vitest and lint checks.

## Progress and decisions

- 2026-10-26: Shared responsive foundation and shell implemented; build and viewport matrix passed.