---
title: "Hero gallery display template"
work_id: "EPIC-hero-gallery-display-template"
work_type: epic
template_version: 1
status: in_progress
parent: null
branch: "epic/hero-gallery-display-template"
depends_on: []
---

# Hero gallery display template

## Outcome and MVP traceability

Priority: ASAP / highest implementation priority. Deliver the shared metadata contract first, then three deterministic showcases in parallel: a free single-occurrence party, a branded food tour, and the unchanged default experience.

## Scope and non-goals

Implement nullable Experience `detailsMetadata` JSON: `{version: 1, template: 'default' | 'party' | 'food-tour', overrides: {heroVideoKey?, heroPosterKey?, pinnedCommentIds?}}`. Only uploaded storage keys and up to three unique positive comment IDs are allowed; no arbitrary CSS, HTML, external media URLs or attendee records. Missing metadata retains the default layout. Organization branding remains on Organization, not Experience.

Details renderer: `frontend/src/routes/experience-details/ExperienceDetails.jsx`; shared resolver: `experienceDetailsTemplate.js`; creation/edit: `routes/create-experience/CreateExperience.jsx` (also used by EditExperience); schema/API: `backend/server/models/Experience.model.js`, `controllers/ExperienceManage.controller.js`. Dedicated case components own alternate rendering. Party: no date picker or organizer bios, one free occurrence, and only a safe public check-in projection. Food tour: widescreen uploaded video, three bottom-pinned five-star top-level comments, compact clickable organizers and allowlisted Organization branding. Default: preserve existing gallery/calendar.

Use the local `frontend/public/video/tacos-hero.mp4` and `tacos-hero-poster.jpg` via the authenticated media upload pipeline/local R2. The current pipeline stores object keys on database records; it has no separate Media model. Keep seed correlation deterministic and integrated by the shared seed coordinator.

## Acceptance criteria

- [x] Validated backward-compatible template contract and authorized creation/edit selector exist.
- [ ] Alternate layout renders edge-to-edge uploaded image carousel OR video, title and two CTAs: "Book now / Get tickets" (opens booking) and "See calendar" (scrolls to/opens session calendar; for single-date experiences shows the date); default experiences retain current layout.
- [ ] Controls are responsive, keyboard accessible and have accessible labels; video is muted/autoplay-safe with a poster image and respects `prefers-reduced-motion`; missing media safely falls back.
- [ ] Deterministic seed shows the alternate layout using the local taco video; tests cover selection, rendering and legacy default.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/routes/create-experience/**`, `edit-experience/**`, `experience-details/**`; Experience management API/controller/model and migration; one isolated seed and tests.
- Shared files/contracts and owner: This Epic owns Experience display-template schema, allowed values/media representation and renderer-selection contract. Epic 3 consumes it. It owns Experience schema migration; prevent competing Experience fields. Seed approach comes from Epic 2.
- Parallel-ready assessment: Shared contract/model/API first; case components and case seed definitions then run in parallel. Shared seed coordinator integrates against the existing correlated seed factory. Shared details renderer and Experience API/model are high-conflict with Epics 3/9; one integration owner only.

## Dependencies and integration

ASAP ordering: this Epic's contract/schema/API -> parallel party / food-tour / default showcases -> correlated seed integration -> targeted verification. Do not block the shared contract behind seed expansion. Epic 3 consumes this contract; Epic 2 supplies seed infrastructure rather than a prerequisite to starting implementation. Coordinate schema/migration with Epic 9; reuse its Organization branding rather than adding competing fields.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Decided CTAs: "Book now / Get tickets" and "See calendar".
- Video source: uploaded files and seed media only; no remote embedding for now.
- Decided: versioned JSON with strict allowlisted overrides. Nullable migration preserves existing records; omitted update metadata preserves the saved selection.
- Risk: the media pipeline may currently accept images only; video MIME types, size limits and R2 content-type handling may need extending, which the seed depends on.

## Verification and completion evidence

Test default and alternate rendering, media validation/fallback, create/edit round-trip and keyboard-accessible controls. Verify the seed uploads `tacos-hero.mp4` and its poster through the media pipeline and the experience references the resulting DB media records.

## Progress and decisions

- 2026-10-28: Reprioritized for ASAP implementation; shared architecture is in progress. Contract published to case/seed owners before their integration. No browser, seeded-runtime or migration execution evidence is claimed here.
- 2026-10-28: Implemented model validation, reversible nullable migration, management read/write round-trip and create/edit selector. Public projection normalizes metadata; frontend falls back to default for unknown versions/templates and only resolves trusted uploaded-key paths.
- 2026-10-28: Targeted backend Jest evidence: `npm test -- --runInBand tests/unit/experience-details-metadata.test.js tests/unit/experience-manage-get.test.js` — 2 suites, 21 tests passed. Covers safe validation, authorized update/read round-trip, unauthorized denial and omitted-metadata preservation. Alternate-case verification belongs to each case owner and is not yet asserted here.
- 2026-10-26: User confirmed seed video is the royalty-free local file in `frontend/public/video/`.
- 2026-10-26: Created 720p `tacos-hero.mp4` (2.7 MB) and `tacos-hero-poster.jpg`; seed must add them via the media pipeline.
