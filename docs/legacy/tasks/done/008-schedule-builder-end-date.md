# 008 — Schedule Builder: Scheduling End Date

**Estimated Difficulty:** 5
**Status:** COMPLETED

## Overview

Rework the schedule builder component to support an optional **"scheduling end date"**. When set, the schedule update lookahead stops generating sessions past this date. When the end date is reached, automatic syncing is disabled until the organizer re-enables it. This applies to both experience creation/editing and the Experiences tab in the organizer profile.

**Depends on:** Task 006 (Deprecate Scheduling Row) — scheduling data lives in `ScheduleTemplate`.

## Requirements

### Functional Requirements

1. `ScheduleTemplate` gains an optional `endDate` field (already exists in the model but may not be utilized).
2. When `endDate` is set, `syncScheduleByCron()` stops generating sessions past the end date, even if the lookahead window extends beyond it.
3. When the current date passes the `endDate`, the system automatically sets `autoSyncEnabled = false` on the experience (or on the specific template via `active = false`).
4. A system check (cron job or on-sync check) detects when the end date has passed and disables sync.
5. The schedule builder UI in `TemplateEditor.jsx` shows an optional "End Date" datepicker.
6. The organizer can clear the end date to re-enable indefinite scheduling.

### Non-Functional Requirements

- End date is stored as a date (no time component) in the experience's timezone.
- The automatic disable check should be efficient (batch query, not per-experience).
- Setting an end date in the past is validated and rejected.

## Current State

- **ScheduleTemplate model**: Already has `startDate` and `endDate` fields, but they may not be actively used by the scheduler logic.
- **`Scheduler.service.js`**: `syncScheduleByCron()` generates sessions from `now` to `now + lookaheadDays`. Does not check `ScheduleTemplate.endDate`.
- **`TemplateEditor.jsx`**: Frontend component for editing cron-based templates. Does not expose a end date picker.
- **No automatic disable mechanism** exists for expired schedules.

## Implementation Steps

### Backend Changes

#### 1. Verify ScheduleTemplate `endDate` Field
- Confirm the `endDate` column exists on `ScheduleTemplate`. If not, create a migration to add it.
- Ensure it accepts `DATE` or `DATEONLY` type.

#### 2. Update `Scheduler.service.js` — `syncScheduleByCron()`
- After computing the end of the lookahead window (`now + lookaheadDays`), clamp it to `Math.min(lookaheadEnd, template.endDate)` if `endDate` is set.
- Skip templates where `endDate < now` (the template has expired).

#### 3. Add End Date Expiration Check
- In `syncExperienceSchedule()` (or as a separate utility), after syncing:
  - Query all `ScheduleTemplate` records where `endDate IS NOT NULL AND endDate < NOW() AND active = true`.
  - Set `active = false` on those templates.
  - Optionally log or notify the organizer.
- Alternatively, integrate this check into the scheduled cron job (if one exists) or with the sync lifecycle.

#### 4. Update `ExperienceManage.controller.js`
- When creating or updating a `ScheduleTemplate`, accept and validate `endDate`.
- Reject `endDate` in the past.
- Allow clearing `endDate` (set to `null`) to remove the limit.

### Frontend Changes

#### 5. Update `TemplateEditor.jsx` — Add End Date Picker
- Add an optional "Schedule End Date" field with a datepicker.
- Label: *"Stop generating sessions after this date (optional)"*.
- When set, display the end date below the cron expression.
- When cleared, show *"No end date — schedule runs indefinitely"*.

#### 6. Update `ScheduleBuilder.jsx` — Pass End Date
- Ensure the end date is included in the template data structure passed to the backend on create/edit.

#### 7. Display End Date Status in `OrgExperiencesPanel`
- For templates with an approaching end date (within 30 days), show a warning badge: *"Schedule ends in X days"*.
- For expired templates, show a notice: *"Schedule ended on [date] — sync disabled"*.

## Files to Create or Modify

| Action | File |
|--------|------|
| Verify/Create | `backend/server/migrations/XXXXXX-ensure-schedule-template-end-date.js` (if field missing) |
| Modify | `backend/server/services/Scheduler.service.js` |
| Modify | `backend/server/controllers/ExperienceManage.controller.js` |
| Modify | `frontend/src/components/schedule-builder/TemplateEditor.jsx` |
| Modify | `frontend/src/components/schedule-builder/ScheduleBuilder.jsx` |
| Modify | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` |

## Definition of Done

- [x] `ScheduleTemplate.endDate` is utilized by the scheduler to limit session generation.
- [x] Sessions are not generated past the end date, even if the lookahead extends beyond it.
- [x] Expired templates are automatically set to `active = false`.
- [x] `TemplateEditor` shows an optional end date picker.
- [x] End date in the past is rejected on create/update.
- [x] Clearing the end date allows indefinite scheduling.
- [x] Expired/approaching end date badges show in the Experiences tab.
- [x] All existing tests pass; new tests cover end date logic.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/scheduler-service.test.js` | Clamps lookahead to endDate when endDate < lookaheadEnd; generates no sessions when endDate < now; skips expired templates; handles null endDate (no clamping); correctly handles endDate on the boundary |
| `tests/unit/experience-manage-controller.test.js` | Accepts endDate on template create/update; rejects past endDate; allows null endDate to clear; expiration check sets `active=false` on expired templates |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `TemplateEditor.test.jsx` | Renders end date picker; selecting a date updates the template data; clearing date resets to null; rejects past dates in validation |
| `OrgExperiencesPanel.test.jsx` | Shows warning badge for templates ending within 30 days; shows expired notice for past end dates |

### Integration Tests

- Create template with endDate 30 days from now → sync → verify sessions only generated through endDate.
- Wait for endDate to pass (or simulate) → verify template set to `active=false`.
- Clear endDate → sync → verify sessions extend to full lookahead.

### Manual Verification

1. In schedule builder, set an end date of 2 months from now → create experience → sync → verify session list.
2. Set end date in the past → verify validation error.
3. Clear end date → verify "indefinite" label.

## Documentation Updates

- **`backend/docs/experiences-schedules.md`**: Document the `endDate` behavior on `ScheduleTemplate`, including expiration logic.
- **`docs/architecture-diagrams.md`**: Note end date clamping in the scheduling flow.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Implementation Notes

### Deviations from Plan

1. **No migration needed**: `ScheduleTemplate` model already had `endDate` (DATE, allowNull: true) — field existed from initial schema.
2. **No cron job for expiration**: Expired templates are auto-deactivated during `syncExperienceSchedule()` rather than via a separate cron. This is simpler and triggers on each sync cycle.
3. **Validation in `normalizeSchedules`**: End-date validation (past date rejection, startDate < endDate check) was added to the shared schedule normalizer rather than the controller, since all create/update flows pass through it.
4. **End date clamping already existed**: The `syncExperienceSchedule()` already had `templateEnd = Math.min(endDate, template.endDate)` logic — only the auto-disable of expired templates was truly new backend work.

### Files Modified

| File | Change |
|------|--------|
| `backend/server/services/Scheduler.service.js` | Added auto-disable logic for expired templates after template sync loop |
| `backend/server/controllers/offering-manage.shared.js` | Added endDate past-date rejection and startDate < endDate validation |
| `frontend/src/components/schedule-builder/TemplateEditor.jsx` | Added optional end date picker with descriptive text |
| `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` | Added end-date status badges (expired: red, approaching ≤30 days: yellow) |

### Files Created

| File | Purpose |
|------|--------|
| `backend/tests/unit/schedule-end-date.test.js` | 8 tests covering scheduler clamping, auto-disable, and validation |

### Test Results

- 220 backend tests across 19 suites, all passing (8 new)
- 169 frontend tests across 12 suites, all passing
