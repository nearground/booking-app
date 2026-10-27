---
title: "Hero gallery display template"
work_id: "EPIC-hero-gallery-display-template"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/hero-gallery-display-template"
depends_on: [EPIC-correlated-seed-factory]
---

# Hero gallery display template

## Outcome and MVP traceability

Experience creation offers an alternate details template with an edge-to-edge image carousel or video hero, title and calls to action.

## Scope and non-goals

Define/implement an Experience `displayTemplate` object chosen at create/edit time. Details renderer: `frontend/src/routes/experience-details/ExperienceDetails.jsx`; creation/edit: `routes/create-experience/CreateExperience.jsx`, `routes/edit-experience/EditExperience.jsx`; schema/API: `backend/server/models/Experience.model.js`, `controllers/ExperienceManage.controller.js`. Existing gallery helpers in `experienceGalleryImages.js`; media upload APIs under `backend/server/routes/media.js`. Seed one example. Seed video: `frontend/public/video/tacos-hero.mp4` (720p H.264, no audio, faststart, 2.7 MB, downscaled from the royalty-free 2160p source in the same folder) with poster `tacos-hero-poster.jpg`. The seeding script uploads both through the normal media pipeline (`backend/server/routes/media.js` / local R2) so they are stored as real media records in the DB, not referenced from `public/`.

## Acceptance criteria

- [ ] Validated backward-compatible template contract and authorized creation/edit selector exist.
- [ ] Alternate layout renders edge-to-edge uploaded image carousel OR video, title and two CTAs: "Book now / Get tickets" (opens booking) and "See calendar" (scrolls to/opens session calendar; for single-date experiences shows the date); default experiences retain current layout.
- [ ] Controls are responsive, keyboard accessible and have accessible labels; video is muted/autoplay-safe with a poster image and respects `prefers-reduced-motion`; missing media safely falls back.
- [ ] Deterministic seed shows the alternate layout using the local taco video; tests cover selection, rendering and legacy default.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/routes/create-experience/**`, `edit-experience/**`, `experience-details/**`; Experience management API/controller/model and migration; one isolated seed and tests.
- Shared files/contracts and owner: This Epic owns Experience display-template schema, allowed values/media representation and renderer-selection contract. Epic 3 consumes it. It owns Experience schema migration; prevent competing Experience fields. Seed approach comes from Epic 2.
- Parallel-ready assessment: Depends on Epic 2. Must publish template contract before Epic 3. Shared details renderer and Experience API/model are high-conflict with Epics 3/9; coordinate integration.

## Dependencies and integration

Epic 2 -> Epic 5 -> Epic 3. Coordinate schema/migration with Epic 9 if its organization work touches Experience APIs; keep Organization branding separate from Experience display templates.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Decided CTAs: "Book now / Get tickets" and "See calendar".
- Video source: uploaded files and seed media only; no remote embedding for now.
- Should template be an enum plus media fields or versioned JSON? Define validation and migration compatibility.
- Risk: the media pipeline may currently accept images only; video MIME types, size limits and R2 content-type handling may need extending, which the seed depends on.

## Verification and completion evidence

Test default and alternate rendering, media validation/fallback, create/edit round-trip and keyboard-accessible controls. Verify the seed uploads `tacos-hero.mp4` and its poster through the media pipeline and the experience references the resulting DB media records.

## Progress and decisions

- Draft created; not approved for implementation. Open decisions remain; no implementation evidence recorded.
- 2026-10-26: User confirmed seed video is the royalty-free local file in `frontend/public/video/`.
- 2026-10-26: Created 720p `tacos-hero.mp4` (2.7 MB) and `tacos-hero-poster.jpg`; seed must add them via the media pipeline.
