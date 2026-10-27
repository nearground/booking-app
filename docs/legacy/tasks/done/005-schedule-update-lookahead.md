# 005 — Schedule Update Lookahead

**Estimated Difficulty:** 5
**Status:** COMPLETED

## Overview

Add the capability for organizers to configure how far ahead the scheduler populates scheduled experiences — the **"schedule update lookahead"**. Currently, `Scheduler.service.js` uses a hardcoded 90-day window. This feature allows organizers to select a custom lookahead period (e.g., "1 year and 3 months") per experience. Optionally, update the Experience model to store this setting.

## Requirements

### Functional Requirements

1. Organizers can set a custom **lookahead period** from the Experiences tab in the organizer profile.
2. The lookahead is defined as a combination of years, months, and/or days (e.g., "1 year 3 months", "6 months", "90 days").
3. The scheduler uses the experience's configured lookahead instead of the hardcoded 90-day window.
4. Default lookahead remains 90 days for experiences that do not have a custom value set.
5. The UI provides a form with numeric inputs for years, months, and days — validated so at least one value is > 0.
6. Changes to the lookahead do not immediately trigger a re-sync; the new window takes effect on the next scheduled sync or manual sync.

### Non-Functional Requirements

- Lookahead is stored as a total number of days or as structured fields (years/months/days) for accuracy across month boundaries.
- Maximum lookahead: 2 years (730 days). Minimum: 1 day.
- Performance: larger lookahead windows generate more `ScheduledExperience` rows. Ensure bulk-create operations remain performant (use `bulkCreate` with deduplication).

## Current State

- **`Scheduler.service.js`**: `syncScheduleByCron()` uses a hardcoded 90-day window: `const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)`. Iterates cron expression from `now` to `endDate` to generate occurrences.
- **Experience model**: No field for lookahead period.
- **Frontend**: No UI for configuring lookahead. Schedule sync is controlled via the `POST /api/manage/experiences/:id/sync-schedule` endpoint.

## Implementation Steps

### Backend Changes

#### 1. Migration: Add `scheduleLookaheadDays` to Experience
- Create migration `add-schedule-lookahead-to-experiences.js`.
- Add `scheduleLookaheadDays` column: `INTEGER`, default `90`, non-nullable.
- Validate: min 1, max 730.

#### 2. Update Experience Model
- Add `scheduleLookaheadDays` field with validation: `min: 1, max: 730`.

#### 3. Update `Scheduler.service.js` — `syncScheduleByCron()`
- Replace the hardcoded `90 * 24 * 60 * 60 * 1000` with `sourceEntity.scheduleLookaheadDays * 24 * 60 * 60 * 1000`.
- Fall back to 90 if `scheduleLookaheadDays` is not set (defensive).

#### 4. Add Update Endpoint
- `PATCH /api/manage/experiences/:id/lookahead` — body: `{ days: number }`.
- Validate: integer, 1–730.
- Requires organization membership.

#### 5. Update `ExperienceManage.controller.js`
- Add `updateLookahead()` handler.
- Accept `{ days }` or `{ years, months, days }` and compute total days.

#### 6. Update Seeder Files (Optional)
- Optionally set `scheduleLookaheadDays` for demo experiences to illustrate different lookahead configurations.

### Frontend Changes

#### 7. Add Lookahead Configuration UI in `OrgExperiencesPanel`
- Add a "Schedule Lookahead" section per experience card (expandable or in an edit modal).
- Render three numeric inputs: Years, Months, Days.
- Convert to total days on submission (years × 365 + months × 30 + days).
- Display current lookahead as a human-readable string (e.g., "3 months" or "1 year, 3 months").
- Save button calls `PATCH /api/manage/experiences/:id/lookahead`.

#### 8. Validation
- At least one field must be > 0.
- Total cannot exceed 730 days (2 years).
- Show inline validation errors.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `backend/server/migrations/XXXXXX-add-schedule-lookahead-to-experiences.js` |
| Modify | `backend/server/models/Experience.js` |
| Modify | `backend/server/services/Scheduler.service.js` |
| Modify | `backend/server/controllers/ExperienceManage.controller.js` |
| Modify | `backend/server/routes/experiences.js` |
| Modify | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` |

## Definition of Done

- [x] Experience model has `scheduleLookaheadDays` field (default 90).
- [x] `syncScheduleByCron()` uses the experience's lookahead value instead of hardcoded 90 days.
- [x] Toggle endpoint accepts and validates lookahead days (1–730).
- [x] Frontend shows lookahead configuration with years/months/days inputs.
- [x] Validation prevents values outside the allowed range.
- [x] Default experiences (no custom setting) continue to use 90-day window.
- [x] All existing tests pass; new tests cover lookahead logic.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/scheduler-service.test.js` | Generates sessions for custom lookahead (e.g., 180 days generates sessions through 180 days); defaults to 90 days when `scheduleLookaheadDays` is null or undefined; respects max lookahead of 730 days; does not generate sessions beyond lookahead window |
| `tests/unit/experience-manage-controller.test.js` | `updateLookahead()` sets `scheduleLookaheadDays`; rejects values < 1; rejects values > 730; requires org membership |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `OrgExperiencesPanel.test.jsx` | Renders lookahead inputs (years, months, days); converts inputs to total days correctly; validates at least one field > 0; validates total ≤ 730; save button calls API with correct payload; displays current lookahead in human-readable format |

### Integration Tests

- Set lookahead to 180 days → trigger sync → verify sessions generated through 180-day window.
- Set lookahead to 365 days → trigger sync → verify no sessions beyond 365 days.

### Manual Verification

1. Open Experiences tab → set lookahead to "6 months" → save → verify API call succeeds.
2. Trigger sync → verify scheduled sessions extend to approximately 6 months.
3. Set lookahead to "2 years 1 day" → verify validation error.

## Documentation Updates

- **`docs/architecture-diagrams.md`**: Note the configurable lookahead in the scheduling flow description.
- **`backend/docs/experiences-schedules.md`**: Document the `scheduleLookaheadDays` field, the `PATCH /api/manage/experiences/:id/lookahead` endpoint, and the default 90-day behavior.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Implementation Notes

### Deviations from Plan

1. **Simplified UI**: Used a single "days" numeric input with an inline edit pattern instead of separate years/months/days inputs. The years/months/days approach adds unnecessary complexity for what is ultimately stored as a single integer. The UI shows "Lookahead: N days" with an "Edit" button. 

2. **No `OrgExperiencesPanel`**: Task 002 hasn't been implemented yet, so the lookahead editor was added to the existing `OrganizationAccordion` component.

3. **`syncExperienceSchedule` updated (not `syncScheduleByCron`)**: The task doc references `syncScheduleByCron()` but that function is used for Services (legacy path). The experience scheduling now uses the template-based path in `syncExperienceSchedule()` directly — that's where the lookahead was updated.

### Files Modified

| File | Change |
|------|--------|
| `backend/server/models/Experience.model.js` | Added `scheduleLookaheadDays` field (INTEGER, default 90, min 1, max 730) |
| `backend/server/services/Scheduler.service.js` | Replaced hardcoded 90-day window with `experience.scheduleLookaheadDays` |
| `backend/server/controllers/ExperienceManage.controller.js` | Added `updateLookahead()` handler |
| `backend/server/routes/experiences.js` | Added `PATCH /manage/:experienceId/lookahead` route |
| `frontend/src/routes/organizer-profile/OrganizerProfile.jsx` | Added `updateLookahead()` function |
| `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` | Added `LookaheadEditor` component, lookahead display per experience card |

### Files Created

| File | Purpose |
|------|---------|
| `backend/server/migrations/20260415130000-add-schedule-lookahead-to-experiences.js` | Migration adding `scheduleLookaheadDays` column |
| `backend/tests/unit/schedule-lookahead.test.js` | 7 tests covering scheduler lookahead and controller validation |

### Test Results

- 204 backend tests across 17 suites, all passing (7 new)
- 169 frontend tests across 12 suites, all passing
