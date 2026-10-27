# 009 — Schedule Builder: Scheduling Start Date

**Estimated Difficulty:** 5
**Status:** COMPLETED

## Overview

Rework the schedule builder component to support an optional **"scheduling start date"**. When set, the automatic scheduler only generates sessions between the start date and the end of the lookahead period. The start date is **cleared automatically** when the date is reached (i.e., it becomes the current effective start). This applies to both experience creation/editing and the Experiences tab in the organizer profile.

**Depends on:** Task 006 (Deprecate Scheduling Row) — scheduling data lives in `ScheduleTemplate`.

## Requirements

### Functional Requirements

1. `ScheduleTemplate` utilizes its existing `startDate` field. When set, the scheduler begins generating sessions from this date instead of `now`.
2. When `startDate` is set and `startDate > now`, `syncScheduleByCron()` generates sessions from `startDate` to `startDate + lookaheadDays` (or to `endDate` if set, per task 008).
3. When `startDate <= now`, the field is cleared (`null`) and the scheduler falls back to using `now` as the start.
4. The clearing happens automatically during sync — no manual action required.
5. The schedule builder UI in `TemplateEditor.jsx` shows an optional "Start Date" datepicker.
6. The organizer can set a future start date during experience creation or editing.

### Non-Functional Requirements

- Start date is stored as a date (no time component) in the experience's timezone.
- Setting a start date in the past is allowed at the API level (it gets cleared on next sync) but the UI should warn the user.
- If both `startDate` and `endDate` are set, `startDate < endDate` must hold.

## Current State

- **ScheduleTemplate model**: Already has `startDate` field, but it may not be actively used by the scheduler logic.
- **`Scheduler.service.js`**: `syncScheduleByCron()` always starts from `now`. Does not check `ScheduleTemplate.startDate`.
- **`TemplateEditor.jsx`**: Does not expose a start date picker.

## Implementation Steps

### Backend Changes

#### 1. Verify ScheduleTemplate `startDate` Field
- Confirm the `startDate` column exists on `ScheduleTemplate`. If not, add via migration.

#### 2. Update `Scheduler.service.js` — `syncScheduleByCron()`
- Compute effective start: `effectiveStart = template.startDate && template.startDate > now ? template.startDate : now`.
- Generate sessions from `effectiveStart` to `effectiveStart + lookaheadDays` (clamped by `endDate` if set).
- After sync, if `template.startDate <= now`, update the template: `template.startDate = null`.

#### 3. Validate in `ExperienceManage.controller.js`
- When creating or updating a `ScheduleTemplate` with both `startDate` and `endDate`, validate `startDate < endDate`.
- Accept `startDate` as an optional field.

### Frontend Changes

#### 4. Update `TemplateEditor.jsx` — Add Start Date Picker
- Add an optional "Schedule Start Date" field with a datepicker.
- Label: *"Start generating sessions from this date (optional)"*.
- When set, display the start date alongside the cron expression.
- Validate: if both start and end date are set, start must be before end.

#### 5. Update `ScheduleBuilder.jsx` — Pass Start Date
- Include `startDate` in the template data structure passed to the backend.

#### 6. Display Start Date Status in `OrgExperiencesPanel`
- For templates with a future start date, show an info badge: *"Scheduling starts [date]"*.
- For templates with no start date, show nothing (default behavior).

## Files to Create or Modify

| Action | File |
|--------|------|
| Verify/Create | Migration (if `startDate` column missing) |
| Modify | `backend/server/services/Scheduler.service.js` |
| Modify | `backend/server/controllers/ExperienceManage.controller.js` |
| Modify | `frontend/src/components/schedule-builder/TemplateEditor.jsx` |
| Modify | `frontend/src/components/schedule-builder/ScheduleBuilder.jsx` |
| Modify | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` |

## Definition of Done

- [x] `ScheduleTemplate.startDate` is utilized by the scheduler as the session generation start point.
- [x] When `startDate > now`, sessions are generated from `startDate` (not `now`).
- [x] When `startDate <= now`, the field is automatically cleared to `null` during sync.
- [x] `TemplateEditor` shows an optional start date picker.
- [x] `startDate < endDate` validation holds when both are set.
- [x] Future start date badge displays in the Experiences tab.
- [x] All existing tests pass; new tests cover start date logic.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/scheduler-service.test.js` | Uses `startDate` as generation start when `startDate > now`; uses `now` when `startDate` is null; clears `startDate` to null when `startDate <= now`; respects both `startDate` and `endDate` (generates sessions in `[startDate, endDate]`); generates sessions in `[startDate, startDate + lookaheadDays]` when no endDate |
| `tests/unit/experience-manage-controller.test.js` | Accepts startDate on template create/update; rejects startDate >= endDate when both provided; allows null startDate |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `TemplateEditor.test.jsx` | Renders start date picker; selecting date updates template data; validates startDate < endDate; clearing resets to null |
| `OrgExperiencesPanel.test.jsx` | Shows info badge for templates with future start date |

### Integration Tests

- Create template with startDate 30 days from now → sync → verify no sessions before startDate.
- Simulate time passing → sync again → verify startDate cleared and sessions generated from now.

### Manual Verification

1. Set a start date 1 month from now → create experience → verify no sessions generated yet.
2. Change start date to today → sync → verify sessions generate immediately.
3. Set both start and end dates → verify sessions only within that range.

## Documentation Updates

- **`backend/docs/experiences-schedules.md`**: Document the `startDate` behavior, auto-clearing logic, and interaction with `endDate` and `lookaheadDays`.
- **`docs/architecture-diagrams.md`**: Note start date logic in the scheduling flow.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Implementation Notes

### Deviations from Plan

1. **No migration needed**: `ScheduleTemplate` model already had `startDate` (DATE, allowNull: true) from initial schema.
2. **startDate already used for clamping**: `syncExperienceSchedule()` already had `templateStart = Math.max(now, template.startDate)`. Only the auto-clear logic was new.
3. **Start and end date pickers combined**: Both start and end date pickers are rendered side by side in a 2-column grid in `TemplateEditor.jsx` for better UX.
4. **Validation shared with task 008**: The `startDate < endDate` validation was already added in task 008's `normalizeSchedules` changes.

### Files Modified

| File | Change |
|------|--------|
| `backend/server/services/Scheduler.service.js` | Added auto-clear logic: sets `startDate = null` on templates where `startDate <= now` |
| `frontend/src/components/schedule-builder/TemplateEditor.jsx` | Added start date picker alongside end date picker |
| `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` | Added blue info badge for templates with future start dates |

### Files Created

| File | Purpose |
|------|--------|
| `backend/tests/unit/schedule-start-date.test.js` | 6 tests covering start date scheduling, auto-clear, and validation |

### Test Results

- 226 backend tests across 20 suites, all passing (6 new)
- 169 frontend tests across 12 suites, all passing
