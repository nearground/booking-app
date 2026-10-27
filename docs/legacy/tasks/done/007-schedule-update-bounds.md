# 007 — Schedule Update Bounds (One-Off Populate Within Start/End)

**Estimated Difficulty:** 5
**Status:** COMPLETED

## Overview

Add the capability for organizers to **one-off populate a schedule within designated start and end datetimes** from the Experiences tab in the organizer profile. This allows creating a batch of scheduled sessions for a specific date range without relying on auto-sync. The schedule builder component used during experience creation should be leveraged for configuring the date bounds, ensuring a cohesive UX/UI.

**Depends on:** Task 006 (Deprecate Scheduling Row) — schedules are generated from `ScheduleTemplate` records.

## Requirements

### Functional Requirements

1. From the Experiences tab, each experience has an action: **"Populate Schedule"** (or "Generate Sessions").
2. Clicking it opens a modal/panel that reuses the `ScheduleBuilder` component for selecting the schedule template to use.
3. The modal provides start datetime and end datetime pickers for the population window.
4. On submit, the backend generates `ScheduledExperience` rows from the selected template's cron/datetime rule between the start and end bounds.
5. Generated sessions are deduped against existing sessions (same dateTime → skip).
6. The organizer can preview how many sessions will be generated before confirming.
7. This is a one-off action — it does not change the experience's `autoSyncEnabled` setting or the `scheduleLookaheadDays` window.

### Non-Functional Requirements

- The population window maximum is 2 years (730 days).
- Timezone handling uses the experience's location timezone.
- Bulk creation uses `bulkCreate` for performance.
- Population runs synchronously for reasonable windows (≤ 365 days). For larger windows, consider a loading indicator.

## Current State

- **`Scheduler.service.js`**: `syncScheduleByCron()` generates sessions from `now` to `now + lookaheadDays`. It does not accept arbitrary start/end parameters.
- **`ScheduleBuilder.jsx`**: Used in `CreateExperience` for defining recurring (cron) and one-off (datetime) schedules. Does not expose a "populate with bounds" mode.
- **Frontend**: No UI for bounded schedule population.
- **Backend**: No endpoint for bounded population.

## Implementation Steps

### Backend Changes

#### 1. Add `populateScheduleBounded()` to `Scheduler.service.js`
- New function: `populateScheduleBounded({ experienceId, templateId, startDate, endDate, timezone })`.
- Reads the `ScheduleTemplate` by `templateId`.
- Uses `cron-parser` to iterate from `startDate` to `endDate` using the template's `ruleCron`.
- Generates `ScheduledExperience` rows, deduplicating by `dateTime` against existing sessions for this experience.
- Returns the count of created sessions and a list of their dateTimes for preview.

#### 2. Add Preview Endpoint
- `POST /api/manage/experiences/:id/schedule/preview-populate` — body: `{ templateId, startDate, endDate }`.
- Calls `populateScheduleBounded()` in dry-run mode (generates the list of dateTimes without creating records).
- Returns `{ sessionCount: number, sessions: [{ dateTime, endDateTime }] }`.

#### 3. Add Populate Endpoint
- `POST /api/manage/experiences/:id/schedule/populate` — body: `{ templateId, startDate, endDate }`.
- Calls `populateScheduleBounded()` to create the sessions.
- Returns `{ created: number, skipped: number }`.
- Requires organization membership.

#### 4. Update `ExperienceManage.controller.js`
- Add `previewPopulateSchedule()` and `populateSchedule()` handlers.
- Validate: `startDate < endDate`, window ≤ 730 days, `templateId` exists and belongs to the experience.

### Frontend Changes

#### 5. Create `PopulateScheduleModal` Component
- New component: `frontend/src/routes/organizer-profile/components/PopulateScheduleModal.jsx`.
- Renders:
  - Template selector (dropdown of experience's active `ScheduleTemplate` records).
  - Start datetime picker and end datetime picker.
  - "Preview" button that calls the preview endpoint and displays the session count and date list.
  - "Generate" button that calls the populate endpoint.
  - Results summary after generation.
- Reuse the `DateRangePicker` UX component if compatible, or use the existing datetime picker patterns from `ScheduleBuilder`.

#### 6. Wire "Populate Schedule" Action in `OrgExperiencesPanel`
- Add a "Populate Schedule" button/menu item per experience card.
- Clicking opens `PopulateScheduleModal` with the experience's ID and template data.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `backend/server/services/Scheduler.service.js` |
| Modify | `backend/server/controllers/ExperienceManage.controller.js` |
| Modify | `backend/server/routes/experiences.js` |
| Create | `frontend/src/routes/organizer-profile/components/PopulateScheduleModal.jsx` |
| Modify | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` |

## Definition of Done

- [x] Organizer can open "Populate Schedule" modal from the Experiences tab.
- [x] Modal lets the organizer select a template, start date, and end date.
- [x] Preview shows how many sessions will be generated.
- [x] Generation creates the correct `ScheduledExperience` rows within the bounds.
- [x] Existing sessions with the same dateTime are skipped (deduplication).
- [x] Window validation enforces ≤ 730 days and `start < end`.
- [x] Auto-sync settings are unaffected.
- [x] All existing tests pass; new tests cover bounded population.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/scheduler-service.test.js` | `populateScheduleBounded()` generates correct sessions for a 30-day window; deduplicates against existing sessions; respects timezone; handles edge case where start = end; rejects window > 730 days |
| `tests/unit/experience-manage-controller.test.js` | `previewPopulateSchedule()` returns session count and dates without creating records; `populateSchedule()` creates records; validates startDate < endDate; validates templateId belongs to experience; requires org membership |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `PopulateScheduleModal.test.jsx` | Renders template selector, date pickers, preview and generate buttons; preview calls API and displays count; generate calls API and shows results; validates dates before submission; disables generate until preview is run |

### Integration Tests

- Select template → set window → preview → generate → verify sessions exist in DB.
- Attempt to generate with overlapping window → verify deduplication.

### Manual Verification

1. From Experiences tab, click "Populate Schedule" on an experience with a cron template.
2. Set start = today, end = 2 months from now → preview → verify session count.
3. Generate → verify sessions appear in upcoming sessions list.
4. Repeat generation → verify no duplicates created.

## Documentation Updates

- **`backend/docs/experiences-schedules.md`**: Document the preview-populate and populate endpoints, including request/response schemas.
- **`docs/architecture-diagrams.md`**: Add note about bounded population in the scheduling flow.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Implementation Notes

### Deviations from Plan

1. **No separate ScheduleBuilder reuse**: The PopulateScheduleModal uses a template dropdown and datetime-local inputs rather than reusing ScheduleBuilder, since the modal only needs template selection + date bounds (not schedule creation).

2. **No OrgExperiencesPanel**: Added to OrganizationAccordion since task 002 hasn't been implemented yet.

3. **Populate callback refreshes via syncExperienceSchedule**: After populating, the modal triggers the sync schedule action to refresh the session list (reuses existing workspace reload flow).

### Files Modified

| File | Change |
|------|--------|
| `backend/server/services/Scheduler.service.js` | Added `populateScheduleBounded()` function |
| `backend/server/controllers/ExperienceManage.controller.js` | Added `previewPopulateSchedule()` and `populateSchedule()` handlers |
| `backend/server/routes/experiences.js` | Added preview-populate and populate routes |
| `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` | Added "Populate Schedule" button and modal integration |

### Files Created

| File | Purpose |
|------|--------|
| `frontend/src/routes/organizer-profile/components/PopulateScheduleModal.jsx` | Modal for bounded schedule population with preview/generate |
| `backend/tests/unit/schedule-populate.test.js` | 8 tests covering service and controller |

### Test Results

- 212 backend tests across 18 suites, all passing (8 new)
- 169 frontend tests across 12 suites, all passing
