---
title: "Responsive UX across device shapes"
work_id: "EPIC-responsive-ux"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/responsive-ux"
depends_on: []
---

# Responsive UX across device shapes

## Outcome and MVP traceability

Every customer-facing screen renders cleanly and is easy to use on phones, tablets, laptops and wide desktops, in portrait and landscape, including notched devices and foldables. Comments get a clearer, more comfortable UX on all sizes.

## Scope and non-goals

The frontend is a Vite React app styled with Tailwind 3 (`frontend/tailwind.config.js`) plus component CSS. Tests: Cypress e2e/component (`frontend/cypress/`) and Vitest.

In scope:

- Device matrix and breakpoints: define a supported viewport matrix (e.g. 360x740, 390x844, 768x1024, 1024x768 landscape, 1280x800, 1920x1080, a foldable ~ 673x841) and align Tailwind breakpoints/container widths.
- Global layout: navbar/menu (including the future EN|ES switcher slot), footer, modals and drawers (cart, booking, comments modal) are usable on small screens; use dynamic viewport units (`dvh`), safe-area insets, no horizontal overflow, no content hidden behind fixed bars or the mobile keyboard.
- Touch and accessibility: 44px minimum touch targets, visible focus, readable type scale, sufficient contrast, `prefers-reduced-motion` respected.
- Media: responsive images (`srcset`/`sizes`, aspect-ratio boxes) to prevent layout shift; galleries swipeable on touch.
- Comments UX: readable comment cards and threads on narrow screens (reply indentation that doesn't collapse text), photo thumbnails in a responsive grid with a full-screen viewer, composer that stays usable with the on-screen keyboard, clear edit/delete/pin affordances and loading/empty/error states.
- Automated visual/layout checks: a Cypress spec that visits key routes at each matrix viewport and asserts no horizontal overflow and key controls are visible; optional screenshot baseline.

Non-goals: redesigning branding or information architecture; new features (handled in feature Epics); internal Docusaurus docs.

## Acceptance criteria

- [ ] Supported device matrix documented in `docs/reference/` and encoded in a Cypress viewport spec.
- [ ] Home, experience browse, experience details (default layout), cart, checkout, receipt, login/register and organizer profile have no horizontal overflow, clipped controls or obscured content at every matrix viewport in portrait and landscape.
- [ ] Modals/drawers fit the dynamic viewport, are scrollable, trap focus and close reliably on touch.
- [ ] Comment list, threads, photo grid/viewer and composer are comfortable at 360px wide and at desktop widths; touch targets >= 44px.
- [ ] Images reserve space (no notable layout shift) and use responsive sources where the media pipeline supports it.
- [ ] Viewport Cypress spec and existing Cypress/Vitest suites pass.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/tailwind.config.js`, global styles, layout shell/navbar/footer, shared modal/drawer components, `frontend/src/components/comments/**` styling and layout, new `frontend/cypress/e2e/responsive/**`.
- Shared files/contracts and owner: This Epic owns breakpoints, layout primitives and the device matrix. Feature Epics consume these primitives for new UI. Comment logic (auth gating, image editing, pins) stays with the comment Epics; this Epic changes comment presentation only.
- Parallel-ready assessment: Global shell and shared primitives are parallel-ready now. Comment presentation overlaps the comment-photo-editing and pinned-comments Epics; land this Epic's comment styling after comment-photo-editing, before pinned comments, or coordinate per file.

## Dependencies and integration

No formal prerequisite. Recommend landing the layout primitives early so the hero, single-date and organization-site Epics build on them; their new screens must pass the same viewport spec.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Risk: broad CSS changes can regress pages; mitigate with the viewport spec and screenshot baselines before refactoring.
- Should the stays/services pages (cart deprecated) be included in the matrix? Recommendation: only smoke coverage.
- Is a separate tablet layout needed, or fluid scaling between mobile and desktop? Recommendation: fluid with targeted tablet adjustments.
- Assumption: organizer/admin panels get smoke coverage only in this Epic.

## Verification and completion evidence

Run the responsive Cypress spec across the matrix, existing Cypress and Vitest suites, and a manual pass on a real phone over the LAN (`http://<LAN-IP>:8080`).

## Progress and decisions

- 2026-10-26: Created from the user's request to improve comments UX and screen rendering across all device shapes.
