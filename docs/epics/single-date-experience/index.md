---
title: "Single-date experience presentation"
work_id: "EPIC-single-date-experience"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/single-date-experience"
depends_on: [EPIC-correlated-seed-factory, EPIC-hero-gallery-display-template]
---

# Single-date experience presentation

## Outcome and MVP traceability

Organizers explicitly create a single-date experience; its details page makes the event date prominent and drops the Upcoming Sessions panel, while staying bookable. Creating a single-date experience is faster because recurring-schedule UI is skipped.

## Scope and non-goals

Decision (user, 2026-10-26): single-date is an explicit organizer choice at creation (schedule type), not derived from session count. This also streamlines the Experience creation page.

Experience details live in `frontend/src/routes/experience-details/ExperienceDetails.jsx`; scheduling UI in `components/scheduled-experiences-list/ScheduledExperiencesList.jsx` and `sessions-preview-panel/SessionsPreviewPanel.jsx`; creation in `routes/create-experience/CreateExperience.jsx` / `routes/edit-experience/EditExperience.jsx`. Backend: `Experience.model.js`, `ScheduledExperience.model.js`, `ScheduleTemplate.model.js`, `controllers/ExperienceManage.controller.js`; demo data in `backend/server/seeders/20260214193720-demo-experiences.js`.

In scope: an Experience `scheduleType` (`recurring` default, `single`); creation/edit flow asks schedule type early and, for `single`, shows one date/time (plus duration/capacity) instead of schedule templates; backend creates exactly one `ScheduledExperience`; details page renders a prominent date block and booking CTA instead of Upcoming Sessions; one seeded example. Consume the hero Epic's `displayTemplate` renderer selection; do not create a second page-template mechanism. Multi-session experiences keep existing behavior.

## Acceptance criteria

- [ ] Organizer selects "Single date" or "Recurring" early in creation; single-date path hides schedule-template UI and asks for one date/time; edit preserves the choice.
- [ ] Backend validates `scheduleType` and enforces exactly one session for `single`; existing experiences migrate to `recurring`.
- [ ] Details page for `single` prominently shows the date/time in the location timezone, with availability and a booking CTA into the existing booking flow; Upcoming Sessions panel is not rendered.
- [ ] Past or cancelled single-date experiences show a clear ended/cancelled state instead of a booking CTA.
- [ ] Organizers can "Convert to multi-date" a current or past single-date experience: this duplicates its details and info (content, media, display template, pricing/ticket tiers, location) into a new recurring experience in draft, leaving the original and its bookings, comments and receipts untouched.
- [ ] Deterministic single-date seed exists; tests cover creation path, validation, details rendering and recurring regression.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/routes/experience-details/**` single-date block; schedule-type step in `routes/create-experience/**` / `edit-experience/**`; `scheduleType` field and migration on Experience; single-session creation in the manage controller/service; one seed fixture; tests.
- Shared files/contracts and owner: Hero Epic owns `displayTemplate` and the creation-page template selector; this Epic owns `scheduleType` and the single-date step. Both add Experience fields and edit the creation page, so this Epic rebases on the hero Epic and adds its own migration after it. Seed-factory Epic owns seed format.
- Parallel-ready assessment: Starts after the seed-factory and hero Epics publish their contracts.

## Dependencies and integration

Order: seed factory -> hero display template -> this Epic. Coordinate details-page edits with comment Epics.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Decided: single-date experiences (current or past) are converted to multi-date by duplication, not by mutating the original. Open: should comments/pins carry over to the copy? Recommendation: no.
- Does a single date allow multiple time slots on that day? Assumption: no, one session.
- Should the prominent date CTA open the booking modal directly? Recommendation: yes.

## Verification and completion evidence

Backend tests for `scheduleType` validation and single-session creation; component tests for creation step and details rendering (single, ended, recurring); seeded example visible in the dev stack.

## Progress and decisions

- 2026-10-26: User decided single-date is an explicit creation choice that also streamlines creation UX.
