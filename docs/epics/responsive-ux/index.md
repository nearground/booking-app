---
title: "Responsive UX across device shapes"
work_id: "EPIC-responsive-ux"
work_type: epic
template_version: 1
status: done
parent: null
branch: "epic/responsive-ux"
depends_on: []
---

# Responsive UX across device shapes

## Outcome and MVP traceability

Customer-facing layouts support the documented phone, tablet, laptop, wide-desktop and foldable viewport matrix. Comment presentation is complete following the comment-photo-editing merge; physical-device keyboard/notch checks remain manual launch checks rather than hardware certification.

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

- [x] Supported device matrix documented in `docs/reference/` and encoded in a Cypress viewport spec.
- [x] Home, experience browse, experience details, populated cart, checkout, receipt, login/register, authenticated organizer profile and public organization profile have no horizontal overflow or clipped primary controls at every matrix viewport. Checkout/receipt matrix cases use explicit router-state layout fixtures; booking suites independently verify real checkout/receipt creation.
- [x] Modals/drawers fit the dynamic viewport, are scrollable, trap focus and close reliably.
- [x] Comment list, threads, photo grid/viewer and composer fit 360px through desktop widths; actions meet >=44px touch targets, including reduced-height composer checks.
- [x] Images reserve layout space; no unsupported responsive-source URLs are invented.
- [x] Viewport Cypress spec and existing Cypress/Vitest suites pass; see release verification and device matrix for coverage boundaries.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/tailwind.config.js`, global styles, layout shell/navbar/footer, shared modal/drawer components, `frontend/src/components/comments/**` styling and layout, new `frontend/cypress/e2e/responsive/**`.
- Shared files/contracts and owner: This Epic owns breakpoints, layout primitives and the device matrix. Feature Epics consume these primitives for new UI. Comment logic (auth gating, image editing, pins) stays with the comment Epics; this Epic changes comment presentation only.
- Parallel-ready assessment: Global shell and shared primitives are parallel-ready now. Comment presentation overlaps comment-photo-editing and pinned-comments work; keep its Tasks pending until comment-photo-editing merges, then land before pinned comments or coordinate per file.

## Dependencies and integration

Layout primitives are merged. Comment-photo-editing is also merged, unblocking Story 004. Later hero/single-date/pinned-comment Epics must preserve this viewport contract.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
- [STORY-001: Navigate and browse comfortably at every viewport](stories/STORY-001-responsive-shell/index.md)
- [STORY-002: Use booking and cart overlays on touch and desktop](stories/STORY-002-responsive-overlays/index.md)
- [STORY-003: Verify responsive layouts across the supported device matrix](stories/STORY-003-viewport-regression/index.md)
- [STORY-004: Read and write comments comfortably across devices](stories/STORY-004-comments-presentation/index.md)
<!-- children:end -->

## Risks, assumptions and open questions

- Risk: broad CSS changes can regress pages; mitigate with the viewport spec and screenshot baselines before refactoring.
- Should the stays/services pages (cart deprecated) be included in the matrix? Recommendation: only smoke coverage.
- Is a separate tablet layout needed, or fluid scaling between mobile and desktop? Recommendation: fluid with targeted tablet adjustments.
- Assumption: organizer/admin panels get smoke coverage only in this Epic.

## Verification and completion evidence

Run the responsive Cypress spec across the matrix, existing Cypress and Vitest suites, and a manual pass on a real phone over the LAN (`http://<LAN-IP>:8080`).

Wave 1 closeout: all four Stories and eight Tasks are complete on main. The route matrix passes 88 checks using actual seeded details, populated carts and authenticated organizer pages; checkout/receipt use explicit layout state. The comments suite passes 11 checks across eight device shapes and three editor heights. Full frontend unit tests pass (283), as does the production build. Physical-device virtual keyboards and production tunnel hosts have not been tested by these automated checks.

## Progress and decisions

- 2026-10-26: Expanded into four Stories and eight Tasks. Stories 001?003 and their six implementation Tasks are complete; the comment Story/Tasks remain not started pending comment-photo-editing merge.
- 2026-10-26: Worktree build succeeded; 80 responsive Cypress checks and the modal focus hook test passed. The full Vitest suite has one unrelated existing Login.test.jsx failure, and repository lint reports pre-existing Cypress booking-test errors.
- Wave 1 closeout: the former Login test failure is resolved on main. Finished comment card/thread wrapping, gallery/dialog focus and scrolling, photo removal touch targets, and labeled scrollable composers. Long authenticated names are bounded in the navbar after the new overflow test exposed the issue. Changed frontend files pass ESLint with only existing warnings.
- The strengthened matrix exposed missing dialog ref/role wiring in booking/cart and a sticky booking header covering the phone field. These are fixed with the shared focus helper, dynamic-viewport dialog shell, non-overlapping header and independent scrolling body. The final booking-modal/cart-checkout/guest-cart/comments regression rerun passes all 29 checks.
