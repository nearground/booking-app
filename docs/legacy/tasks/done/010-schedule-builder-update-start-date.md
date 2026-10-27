# 010 — Schedule Builder: Update Start Date for Existing Experiences

**Status:** COMPLETED  
**Estimated Difficulty:** 8

## Overview

When updating the schedule for an existing experience, allow the organizer to set a **new scheduling start date** starting at the end of the previous schedule's lookahead period. Provide the option for the organizer to **cancel all old non-empty scheduled sessions**, with a warning that they must manage non-empty sessions (sessions with reservations) manually.

**Depends on:** Task 006 (Deprecate Scheduling Row), Task 009 (Schedule Builder Start Date).

## Requirements

### Functional Requirements

1. When editing an existing experience's schedule, a "Set New Start Date" option is available.
2. The new start date defaults to the **end of the previous schedule's lookahead period** (last generated session date + 1 day).
3. On setting a new start date, the organizer is presented with an option: **"Cancel old scheduled sessions?"** with a checkbox.
4. If checked, the system:
   - Identifies all `ScheduledExperience` rows for this experience with `dateTime < newStartDate`.
   - Separates them into **empty** sessions (no reservations) and **non-empty** sessions (have `ExperienceReservation` records).
   - **Cancels empty sessions** automatically: sets `status = 'cancelled'`.
   - **Warns about non-empty sessions**: displays a list with reservation counts. These are not auto-cancelled. The warning reads: *"The following sessions have existing bookings and must be managed manually: [list]"*.
5. If unchecked, old sessions remain unchanged.
6. The new start date is applied to the `ScheduleTemplate.startDate`, and the next sync generates sessions from there.

### Non-Functional Requirements

- Cancellation of empty sessions is performed in a transaction.
- Non-empty session list is returned to the frontend for display before the organizer confirms.
- The operation is two-step: preview (shows affected sessions) → confirm (executes cancellation + start date update).

## Current State

- **`ScheduleTemplate`**: Has `startDate` field (utilized per task 009).
- **`ScheduledExperience`**: Has `status` (enum includes 'cancelled'), `ExperienceId`, `dateTime`. Has zero or more `ExperienceReservation` associations.
- **`ExperienceReservation`**: Has `ScheduledExperienceId`, `status`, `numberOfAttendees`.
- **No UI or endpoint** exists for setting a new start date on an existing experience schedule or for batch-cancelling old sessions.

## Implementation Steps

### Backend Changes

#### 1. Add Preview Endpoint
- `POST /api/manage/experiences/:id/schedule/preview-start-date-update` — body: `{ newStartDate }`.
- Returns:
  ```json
  {
    "emptySessions": [{ "id": 1, "dateTime": "..." }, ...],
    "nonEmptySessions": [{ "id": 5, "dateTime": "...", "reservationCount": 3 }, ...],
    "suggestedStartDate": "2026-07-01"
  }
  ```
- The `suggestedStartDate` is calculated as `lastGeneratedSession.dateTime + 1 day`.
- Requires organization membership.

#### 2. Add Confirm Endpoint
- `POST /api/manage/experiences/:id/schedule/update-start-date` — body: `{ newStartDate, cancelEmptySessions: boolean }`.
- If `cancelEmptySessions`:
  - In a transaction, set `status = 'cancelled'` on all `ScheduledExperience` rows where `dateTime < newStartDate` AND have zero `ExperienceReservation` records.
- Update the experience's active `ScheduleTemplate.startDate` to `newStartDate`.
- Returns the count of cancelled sessions and the list of non-empty sessions that were skipped.

#### 3. Update `ExperienceManage.controller.js`
- Add `previewStartDateUpdate()` and `confirmStartDateUpdate()` handlers.
- Query `ScheduledExperience` with LEFT JOIN on `ExperienceReservation` to classify empty vs. non-empty.

#### 4. Add Service Function
- Add `scheduleStartDateUpdate()` to `Scheduler.service.js` or create a dedicated helper for this multi-step operation.
- Handle the transaction: cancel empties, skip non-empties, update template start date.

### Frontend Changes

#### 5. Create `UpdateStartDateModal` Component
- New component: `frontend/src/routes/organizer-profile/components/UpdateStartDateModal.jsx`.
- Step 1 (Preview):
  - Shows the suggested new start date (editable via datepicker).
  - Calls the preview endpoint.
  - Displays: "X empty sessions will be cancelled" and "Y sessions with bookings must be managed manually" (with expandable list showing dates and reservation counts).
  - Checkbox: "Cancel empty sessions before the new start date".
- Step 2 (Confirm):
  - "Confirm" button calls the update endpoint.
  - Shows results: "X sessions cancelled. Y sessions with bookings were left unchanged."
- Warning banner (Tailwind: `bg-red-50 border-red-400 text-red-800`): *"Sessions with existing bookings will NOT be cancelled. You must manage these manually from the Sessions tab."*

#### 6. Wire into Experience Edit Flow
- Add "Update Start Date" action in `OrgExperiencesPanel` or in the experience edit mode (task 003).
- Can also be accessible from the `ScheduleBuilder` when in edit mode.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `backend/server/services/Scheduler.service.js` (or create helper) |
| Modify | `backend/server/controllers/ExperienceManage.controller.js` |
| Modify | `backend/server/routes/experiences.js` |
| Create | `frontend/src/routes/organizer-profile/components/UpdateStartDateModal.jsx` |
| Modify | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` |
| Modify (optional) | `frontend/src/components/schedule-builder/ScheduleBuilder.jsx` |

## Definition of Done

- [x] Organizer can set a new start date for an existing experience's schedule.
- [x] Default start date is at the end of the previous lookahead period.
- [x] Preview shows empty sessions (cancellable) and non-empty sessions (manual management required).
- [x] Empty sessions are cancelled in a transaction when the organizer confirms.
- [x] Non-empty sessions are NOT cancelled — a warning is displayed.
- [x] `ScheduleTemplate.startDate` is updated to the new start date.
- [x] All existing tests pass; new tests cover the start date update flow.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/scheduler-service.test.js` | `scheduleStartDateUpdate()` preview correctly classifies empty vs. non-empty sessions; cancels only empty sessions when `cancelEmptySessions=true`; does not cancel any sessions when `cancelEmptySessions=false`; updates ScheduleTemplate.startDate; handles experience with no sessions; transaction rolls back on error |
| `tests/unit/experience-manage-controller.test.js` | Preview endpoint returns correct session breakdown; confirm endpoint calls service with correct params; validates newStartDate is a valid date; requires org membership |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `UpdateStartDateModal.test.jsx` | Renders suggested start date; calls preview API on mount; displays empty and non-empty session counts and lists; checkbox controls `cancelEmptySessions` param; confirm button calls update API; displays warning banner for non-empty sessions; shows results after confirmation |

### Integration Tests

- Create experience with sessions, some with reservations → preview start date update → verify classification.
- Confirm with cancel → verify empty sessions cancelled, non-empty untouched.
- Verify ScheduleTemplate.startDate updated → next sync generates from new start.

### Manual Verification

1. Edit an experience schedule → click "Update Start Date" → verify preview shows session breakdown.
2. Check "Cancel empty sessions" → confirm → verify empty sessions cancelled.
3. Verify non-empty sessions still appear in upcoming sessions with their bookings intact.
4. Trigger sync → verify new sessions generated from the new start date.

## Documentation Updates

- **`backend/docs/experiences-schedules.md`**: Document the preview-start-date-update and update-start-date endpoints.
- **`docs/architecture-diagrams.md`**: Note the start date update flow in the scheduling section.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Implementation Notes

### Deviations from Plan
- Route paths use `/api/experiences/manage/:experienceId/schedule/preview-start-date` and `.../update-start-date` (matching existing route patterns) instead of `/api/manage/experiences/:id/schedule/...`.
- Service functions named `previewStartDateUpdate()` and `confirmStartDateUpdate()` in `Scheduler.service.js` (no separate helper file).
- Frontend wired into `OrganizationAccordion.jsx` (next to "Populate Schedule" button) rather than `OrgExperiencesPanel` since that component doesn't exist.

### Files Modified/Created
- `backend/server/services/Scheduler.service.js` — Added `previewStartDateUpdate()` and `confirmStartDateUpdate()`
- `backend/server/controllers/ExperienceManage.controller.js` — Added `previewStartDate()` and `confirmStartDate()` handlers
- `backend/server/routes/experiences.js` — Added two new POST routes
- `frontend/src/routes/organizer-profile/components/UpdateStartDateModal.jsx` — New two-step modal component (preview → confirm)
- `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` — Added "Update Start Date" button and modal rendering
- `backend/tests/unit/schedule-update-start-date.test.js` — 8 unit tests

### Test Results
- Backend: 234 tests / 21 suites — all passing
- Frontend: 169 tests / 12 suites — all passing
