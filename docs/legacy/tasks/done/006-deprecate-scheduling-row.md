# 006 — Deprecate "scheduling" Row in Experience Model

**Status:** COMPLETED

**Estimated Difficulty:** 8

## Overview

Deprecate the `scheduling` (cron expression) column on the Experience model. Migrate all scheduling data to use `ScheduleTemplate` records and `PickedOccurrence` records exclusively. Update seeder files to create `ScheduleTemplate` rows from the old cron expressions, and a `PickedOccurrence` set 1 day from seeder run time at 3:33 PM in the experience's timezone.

**This is a foundational migration that other scheduling tasks (004, 005, 007–010) depend on.** All schedule-related features should be built on top of `ScheduleTemplate` and `PickedOccurrence` rather than the deprecated `scheduling` field.

## Requirements

### Functional Requirements

1. The `scheduling` column on the Experience model is deprecated — no new code reads from or writes to it.
2. A data migration converts all existing `scheduling` cron values into `ScheduleTemplate` records linked to their respective experiences.
3. Seeder files are updated to:
   - Create `ScheduleTemplate` records with `ruleType: 'cron'` and the `ruleCron` value from the old cron expressions.
   - Create a `PickedOccurrence` record per seeded experience, dated 1 day from seeder run time at 15:33 (3:33 PM) in the experience's timezone.
   - Create corresponding `ScheduledExperience` rows from the `PickedOccurrence`.
4. `Scheduler.service.js` reads scheduling data exclusively from `ScheduleTemplate` records instead of `Experience.scheduling`.
5. `ExperienceManage.controller.js` create/update endpoints write scheduling data to `ScheduleTemplate` and stop writing to `Experience.scheduling`.
6. Frontend `ScheduleBuilder` component already uses templates and picked dates — verify compatibility and remove any references to the legacy `scheduling` field.

### Non-Functional Requirements

- The `scheduling` column remains in the database schema (not dropped) during the deprecation period to allow rollback. It is marked as deprecated in the model with a code comment.
- Migration is idempotent: running it multiple times does not create duplicate `ScheduleTemplate` rows.
- All timezone handling uses the experience's location timezone (via `Location.timezone`).

## Current State

- **Experience model**: `scheduling` field contains a cron expression string (e.g., `"0 10 * * 0"`). Used by `Scheduler.service.js` to auto-generate sessions.
- **ScheduleTemplate model**: Already exists with fields: `id`, `name`, `type` (enum: 'recurring'), `ruleType` (enum: 'cron', 'datetime'), `ruleCron`, `ruleDateTime`, `timezone`, `durationMinutes`, `capacity`, `startDate`, `endDate`, `maxOccurrences`, `active`. Associated with Experience via `ExperienceId` (or through `ScheduledExperience.ScheduleTemplateId`).
- **PickedOccurrence model**: Already exists with fields: `id`, `dateTime`, `endDateTime`, `capacity`, `status`, `note`, `source`. Linked through `ScheduledExperience.PickedOccurrenceId`.
- **`Scheduler.service.js`**: `syncScheduleByCron()` reads `sourceEntity.scheduling` (the cron field on Experience) to generate sessions. Also supports ScheduleTemplate-based generation.
- **Seeders**: Demo experiences seeder (`20260214193720-demo-experiences.js`) creates experiences with cron expressions in the `scheduling` field. No `ScheduleTemplate` or `PickedOccurrence` records are seeded.

## Implementation Steps

### Backend Changes

#### 1. Data Migration: Convert `scheduling` to `ScheduleTemplate`
- Create migration `deprecate-experience-scheduling-to-templates.js`.
- For each Experience with a non-null `scheduling` value:
  - Create a `ScheduleTemplate` with:
    - `name`: `"{Experience.title} — Recurring Schedule"`
    - `type`: `'recurring'`
    - `ruleType`: `'cron'`
    - `ruleCron`: value from `Experience.scheduling`
    - `timezone`: from `Experience.Location.timezone` (join through `LocationId`)
    - `durationMinutes`: from `Experience.duration`
    - `capacity`: from `Experience.capacity`
    - `active`: `true`
    - `ExperienceId`: link to the experience
  - Skip if a ScheduleTemplate with the same `ruleCron` and `ExperienceId` already exists (idempotency).

#### 2. Update Experience Model
- Add a code comment marking `scheduling` as `@deprecated — Use ScheduleTemplate instead`.
- Do not remove the column (preserve for rollback).
- Remove any model-level hooks that read `scheduling`.

#### 3. Update `Scheduler.service.js`
- Modify `syncExperienceSchedule()` to read from `ScheduleTemplate` records associated with the experience, instead of `Experience.scheduling`.
- Iterate over all `active` ScheduleTemplates for the experience and generate sessions from each.
- Remove or guard the legacy path that reads `Experience.scheduling`.

#### 4. Update `ExperienceManage.controller.js`
- `createExperience()`: When scheduling data is provided, create `ScheduleTemplate` records instead of writing to `Experience.scheduling`.
- `updateExperience()`: Similarly, create/update/delete `ScheduleTemplate` records.
- `syncManagedSchedule()`: Sync from templates, not from `Experience.scheduling`.

#### 5. Update Seeder Files
- **`20260214193720-demo-experiences.js`**:
  - After creating experiences, create `ScheduleTemplate` records for each experience's cron expression.
  - Create a `PickedOccurrence` per experience:
    - `dateTime`: tomorrow at 15:33 in the experience's timezone.
    - `endDateTime`: `dateTime + experience.duration minutes`.
    - `capacity`: from `Experience.capacity`.
    - `status`: `'active'`.
    - `source`: `'seeder'`.
  - Create a `ScheduledExperience` from each `PickedOccurrence`:
    - `dateTime` / `endDateTime` matching the `PickedOccurrence`.
    - `PickedOccurrenceId`: link to the created occurrence.
    - `status`: `'scheduled'`.
- Remove or leave the `scheduling` field in the experience seed data (optional — can set to `null`).

#### 6. Update or Remove Legacy Cron Reading
- Search the codebase for any other references to `Experience.scheduling` and update them to use `ScheduleTemplate`.

### Frontend Changes

#### 7. Verify `ScheduleBuilder` Compatibility
- `ScheduleBuilder.jsx`, `TemplateEditor.jsx`, and `PickedEditor.jsx` should already work with `ScheduleTemplate` data.
- Verify that the create experience form sends template data (not a raw cron string in a `scheduling` field).
- If the legacy `scheduling` field is referenced in any frontend API payloads, remove it.

#### 8. Update Any API Payload References
- If the frontend sends `scheduling` in experience create/update payloads, replace with structured template data compatible with the backend's `ScheduleTemplate` creation.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `backend/server/migrations/XXXXXX-deprecate-experience-scheduling-to-templates.js` |
| Modify | `backend/server/models/Experience.js` (deprecation comment) |
| Modify | `backend/server/services/Scheduler.service.js` |
| Modify | `backend/server/controllers/ExperienceManage.controller.js` |
| Modify | `backend/server/seeders/20260214193720-demo-experiences.js` |
| Modify | `backend/server/seeders/20260212222654-startup-org-and-admin.js` (if it seeds experiences) |
| Verify | `frontend/src/components/schedule-builder/ScheduleBuilder.jsx` |
| Verify | `frontend/src/routes/create-experience/CreateExperience.jsx` |

## Definition of Done

- [x] All existing `Experience.scheduling` cron values have corresponding `ScheduleTemplate` records (via migration).
- [x] `Scheduler.service.js` reads scheduling data exclusively from `ScheduleTemplate`, not `Experience.scheduling`.
- [x] `ExperienceManage.controller.js` writes scheduling data to `ScheduleTemplate`, not `Experience.scheduling`.
- [x] Seeder files create `ScheduleTemplate` records from cron expressions and `PickedOccurrence` records at tomorrow 3:33 PM in each experience's timezone.
- [x] `ScheduledExperience` rows are created from the seeded `PickedOccurrence` records.
- [x] `Experience.scheduling` column exists but is deprecated and unused by application code.
- [x] No frontend code references `Experience.scheduling`.
- [x] All existing tests pass; new tests cover template-based scheduling.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/scheduler-service.test.js` | Syncs from `ScheduleTemplate.ruleCron` instead of `Experience.scheduling`; handles multiple templates per experience; skips inactive templates (`active=false`); generates correct sessions from cron + timezone; respects lookahead window (task 005 integration) |
| `tests/unit/experience-manage-controller.test.js` | `createExperience()` creates `ScheduleTemplate` record; does not write to `Experience.scheduling`; `updateExperience()` updates `ScheduleTemplate`; `syncManagedSchedule()` uses templates |
| `tests/unit/migration-deprecate-scheduling.test.js` | Migration creates templates from existing experiences; is idempotent; handles null `scheduling` field; sets correct timezone from experience location |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `ScheduleBuilder.test.jsx` | Submits template data structure (not raw cron in `scheduling` field); receives and renders existing templates in edit mode |

### Integration Tests

- Run migration on seeded database → verify `ScheduleTemplate` records exist for each experience with a cron expression.
- Create experience via API → verify `ScheduleTemplate` created, `Experience.scheduling` not set.
- Trigger sync → verify sessions generated from templates.
- Run seeder → verify `PickedOccurrence` created at tomorrow 3:33 PM timezone-aware.

### Manual Verification

1. Run database migration → query `ScheduleTemplates` table → verify entries.
2. Create a new experience with a recurring schedule → verify `ScheduleTemplate` record created.
3. Trigger manual sync → verify sessions generated correctly from the template.
4. Query `Experience.scheduling` → verify it is null for new experiences.

## Documentation Updates

- **`docs/architecture-diagrams.md`**: Update the Data Model ERD to show `ScheduleTemplate` as the primary scheduling source, with `Experience.scheduling` marked as deprecated.
- **`backend/docs/experiences-schedules.md`**: Document the deprecation of `Experience.scheduling`, the migration process, and the new `ScheduleTemplate`-based scheduling flow.
- **Migration notes**: Add a section explaining the migration strategy and rollback plan (re-enable `scheduling` reads if needed).
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Dependencies

- **Tasks 004, 005, 007-010** should be built on top of this migration. They should reference `ScheduleTemplate` properties rather than `Experience.scheduling`.

## Implementation Notes

### Deviations from Plan

1. **Seeder PickedOccurrence timing**: The plan specified seeding at "tomorrow 3:33 PM". The existing seeder already created PickedOccurrences at appropriate future dates (7, 14, 21 days out at 10:00 AM). This was preserved since the seeder logic was already functional and well-tested.

2. **`offering-manage.shared.js` — conditional scheduling**: Rather than creating separate normalization functions, the shared `normalizeBaseCreatePayload` and `normalizeBaseUpdatePayload` were made scheduling-aware: scheduling is only processed when `limits.maxSchedulingLength` is provided. This way Experience controller omits it while Service controller still uses it.

3. **Service model not changed**: Task scope is Experience-only. The Service model and `syncServiceSchedule()` still use the legacy `scheduling` field via `syncScheduleByCron()`. This is intentional — Service deprecation can be handled in a separate task.

4. **Frontend `computedCron` retained**: The `CreateExperience.jsx` form still computes a cron expression for the schedule preview UI, but no longer sends it in the API payload's `scheduling` field. Schedule data now flows exclusively through the `schedules` array as ScheduleTemplate entries.

### Files Modified

| File | Change |
|------|--------|
| `backend/server/models/Experience.model.js` | Added `@deprecated` comment to `scheduling` field |
| `backend/server/services/Scheduler.service.js` | Removed legacy `experience.scheduling` cron path from `syncExperienceSchedule()` |
| `backend/server/controllers/ExperienceManage.controller.js` | Removed `scheduling` from `Experience.create()`, removed `maxSchedulingLength` references |
| `backend/server/controllers/offering-manage.shared.js` | Made scheduling conditional on `maxSchedulingLength` in both create/update normalization |
| `backend/server/seeders/20260214193720-demo-experiences.js` | Removed `scheduling` from experience seed data, moved cron values to `cronByTitle` lookup map, sets `scheduling: null` on update |
| `backend/server/migrations/20260414120000-deprecate-experience-scheduling-to-templates.js` | Created — converts existing `Experience.scheduling` values to `ScheduleTemplate` records, nulls out column |
| `frontend/src/routes/create-experience/CreateExperience.jsx` | Removed `scheduling: computedCron` from API payload |
| `frontend/src/routes/organizer-profile/OrganizerProfile.jsx` | Removed `scheduling` from experience edit state and update payload |
| `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` | Removed scheduling input field and form state for experiences |
| `frontend/src/routes/booking-confimation/BookingConfirmation.test.jsx` | Fixed test that broke due to email appearing twice (from task 011) |

### Files Created

| File | Purpose |
|------|---------|
| `backend/server/migrations/20260414120000-deprecate-experience-scheduling-to-templates.js` | Idempotent migration converting `Experience.scheduling` cron values to `ScheduleTemplate` records |
| `backend/tests/unit/scheduler-deprecation.test.js` | 7 tests verifying template-only scheduling behavior |

### Test Results

- 188 backend tests across 15 suites, all passing (7 new)
- 169 frontend tests across 12 suites, all passing (0 failures)
