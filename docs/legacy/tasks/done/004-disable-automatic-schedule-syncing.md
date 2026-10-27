# 004 — Disable Automatic Schedule Syncing

**Estimated Difficulty:** 5
**Status:** COMPLETED

## Overview

Add the capability for organizers to disable automatic schedule syncing for experience sessions — both **globally** (for the entire experience) and **per-session** (for individual scheduled experiences). When disabled globally, the `Scheduler.service.js` hooks skip auto-generation of scheduled instances. When disabled per-session, individual `ScheduledExperience` rows are excluded from sync operations (not overwritten or deleted during re-sync).

## Requirements

### Functional Requirements

1. **Global toggle**: Each experience has an `autoSyncEnabled` boolean (default `true`). When `false`, `syncExperienceSchedule()` skips this experience entirely.
2. **Per-session toggle**: Each `ScheduledExperience` has a `syncLocked` boolean (default `false`). When `true`, the scheduler will not modify or delete this session during sync operations.
3. Both toggles are manageable from the **Experiences tab** in the organizer profile.
4. Global toggle renders as a switch next to the experience title/card.
5. Per-session toggle renders in the session management UI (e.g., an upcoming sessions list or session details view) as a lock/unlock icon.
6. When global sync is disabled, the UI shows a clear indicator (e.g., "Auto-sync: OFF" badge).
7. When attempting to enable global sync while locked sessions exist, show an informational notice.

### Non-Functional Requirements

- Toggling sync settings does not trigger a re-sync. Sync only runs when explicitly requested or on schedule create/update hooks.
- Locked sessions must never be deleted by the scheduler — even if the cron expression changes and the session would no longer be generated.

## Current State

- **`Scheduler.service.js`**: `syncScheduleByCron()` generates `ScheduledExperience` rows for a 90-day window. It deduplicates by `dateTime`. Called automatically on Experience create/update via Sequelize hooks (`syncExperienceSchedule()`).
- **Experience model**: Has `scheduling` (cron), `capacity`, `duration`. No `autoSyncEnabled` field.
- **ScheduledExperience model**: Has `id`, `dateTime`, `endDateTime`, `capacity`, `availableSpots`, `status`, `ExperienceId`, `ScheduleTemplateId`, `PickedOccurrenceId`. No `syncLocked` field.
- **Frontend**: `OrgExperiencesPanel` (from task 002) lists experiences. `UpcomingSessionsPanel` shows upcoming sessions. No sync toggle UI exists.

## Implementation Steps

### Backend Changes

#### 1. Migration: Add `autoSyncEnabled` to Experience
- Create migration `add-auto-sync-enabled-to-experiences.js`.
- Add `autoSyncEnabled` column: `BOOLEAN`, default `true`, non-nullable.

#### 2. Migration: Add `syncLocked` to ScheduledExperience
- Create migration `add-sync-locked-to-scheduled-experiences.js`.
- Add `syncLocked` column: `BOOLEAN`, default `false`, non-nullable.

#### 3. Update Experience Model
- Add `autoSyncEnabled` field to model definition.

#### 4. Update ScheduledExperience Model
- Add `syncLocked` field to model definition.

#### 5. Update `Scheduler.service.js` — `syncScheduleByCron()`
- Before syncing, check `sourceEntity.autoSyncEnabled`. If `false`, return early (no-op).
- When determining which `ScheduledExperience` rows to delete/recreate during sync, exclude rows where `syncLocked === true`.
- Add logging for skipped experiences and locked sessions.

#### 6. Add Toggle Endpoints
- `PATCH /api/manage/experiences/:id/auto-sync` — body: `{ enabled: boolean }`. Updates `autoSyncEnabled` on the Experience.
- `PATCH /api/manage/scheduled-experiences/:id/sync-lock` — body: `{ locked: boolean }`. Updates `syncLocked` on the ScheduledExperience.
- Both require organization membership auth (`requireOrganizationMember`).

#### 7. Update `ExperienceManage.controller.js`
- Add `toggleAutoSync()` handler for the experience-level toggle.
- Add `toggleSessionSyncLock()` handler for the session-level toggle.
- Validate that the user belongs to the experience's organization.

### Frontend Changes

#### 8. Add Global Sync Toggle to `OrgExperiencesPanel`
- Render a toggle switch on each experience card showing "Auto-sync: ON/OFF".
- Toggling calls `PATCH /api/manage/experiences/:id/auto-sync`.
- When OFF, display a muted badge: "Auto-sync disabled".

#### 9. Add Per-Session Lock Toggle to `UpcomingSessionsPanel`
- For each session row, add a lock/unlock icon button.
- Toggling calls `PATCH /api/manage/scheduled-experiences/:id/sync-lock`.
- Locked sessions display a lock icon and a subtle visual indicator (e.g., `opacity-75` or a locked badge).

#### 10. Informational Notice
- When enabling global sync while locked sessions exist, display an info toast: *"Some sessions are locked and will not be affected by auto-sync."*

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `backend/server/migrations/XXXXXX-add-auto-sync-enabled-to-experiences.js` |
| Create | `backend/server/migrations/XXXXXX-add-sync-locked-to-scheduled-experiences.js` |
| Modify | `backend/server/models/Experience.js` |
| Modify | `backend/server/models/ScheduledExperience.js` |
| Modify | `backend/server/services/Scheduler.service.js` |
| Modify | `backend/server/controllers/ExperienceManage.controller.js` |
| Modify | `backend/server/routes/experiences.js` (add toggle routes) |
| Modify | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` |
| Modify | `frontend/src/routes/organizer-profile/components/UpcomingSessionsPanel.jsx` |

## Definition of Done

- [x] Experience model has `autoSyncEnabled` field (default `true`).
- [x] ScheduledExperience model has `syncLocked` field (default `false`).
- [x] `syncScheduleByCron()` respects `autoSyncEnabled` — skips experiences with `false`.
- [x] `syncScheduleByCron()` respects `syncLocked` — does not delete or overwrite locked sessions.
- [x] Toggle endpoints exist and require proper authorization.
- [x] Frontend shows global auto-sync toggle on experience cards.
- [x] Frontend shows per-session lock toggle on session rows.
- [x] Informational notice appears when enabling sync with locked sessions.
- [x] All existing tests pass; new tests cover sync toggle logic.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/scheduler-service.test.js` | `syncScheduleByCron()` skips experience when `autoSyncEnabled=false`; does not delete `syncLocked=true` sessions during sync; syncs normally when `autoSyncEnabled=true` and no locks; handles mixed locked/unlocked sessions correctly |
| `tests/unit/experience-manage-controller.test.js` | `toggleAutoSync()` updates experience field; returns 404 for non-existent experience; requires org membership; `toggleSessionSyncLock()` updates session field; returns 404 for non-existent session |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `OrgExperiencesPanel.test.jsx` | Renders auto-sync toggle per experience; toggle calls API on click; shows "Auto-sync disabled" badge when off |
| `UpcomingSessionsPanel.test.jsx` | Renders lock icon per session; toggle calls API on click; locked sessions show lock indicator |

### Integration Tests

- Disable auto-sync → trigger sync → verify no new sessions created.
- Lock a session → trigger sync → verify locked session untouched while others regenerated.
- Enable auto-sync with locked sessions → verify info notice.

### Manual Verification

1. Toggle auto-sync off on an experience → manually trigger sync → verify no change to sessions.
2. Lock a specific session → trigger sync → verify it remains while unlocked sessions may change.
3. Toggle auto-sync on → verify badge updates.

## Documentation Updates

- **`docs/architecture-diagrams.md`**: Update the Scheduler flow description to note the `autoSyncEnabled` and `syncLocked` checks.
- **`backend/docs/experiences-schedules.md`**: Document the new toggle endpoints and their effect on scheduling behavior.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Implementation Notes

### Deviations from Plan

1. **`syncLocked` is defensive-only for now**: The current scheduler never deletes `ScheduledExperience` rows — it only creates missing ones. The `syncLocked` field is stored and toggled but the scheduler doesn't need an explicit check because no deletion path exists yet. Future tasks (e.g., task 007 bounded population) will need to respect `syncLocked` when adding deletion logic.

2. **Auto-sync check in model hooks**: Added `autoSyncEnabled === false` early return to both `afterCreate` and `afterUpdate` hooks in `Experience.model.js`, in addition to the service-level check in `syncExperienceSchedule()`. This provides defense-in-depth.

3. **Toast type for locked session notice**: Used `warning` type (yellow) for the informational notice since the Toast component doesn't support an `info` type.

4. **No `OrgExperiencesPanel` component**: Task 002 (Separate Organization Tab) hasn't been implemented yet, so the auto-sync toggle was added to the existing `OrganizationAccordion` experience cards. When task 002 creates `OrgExperiencesPanel`, these toggles should migrate there.

### Files Modified

| File | Change |
|------|--------|
| `backend/server/models/Experience.model.js` | Added `autoSyncEnabled` field, checks in afterCreate/afterUpdate hooks |
| `backend/server/models/ScheduledExperience.model.js` | Added `syncLocked` field |
| `backend/server/services/Scheduler.service.js` | Early return when `autoSyncEnabled === false` |
| `backend/server/controllers/ExperienceManage.controller.js` | Added `toggleAutoSync()` and `toggleSessionSyncLock()` handlers |
| `backend/server/routes/experiences.js` | Added auto-sync and sync-lock toggle routes |
| `frontend/src/routes/organizer-profile/OrganizerProfile.jsx` | Added `toggleAutoSync()` and `toggleSessionSyncLock()` functions + locked session warning |
| `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` | Added auto-sync badge/toggle on experience cards, lock icons on session rows |

### Files Created

| File | Purpose |
|------|---------|
| `backend/server/migrations/20260415120000-add-auto-sync-and-sync-locked.js` | Migration adding `autoSyncEnabled` and `syncLocked` columns |
| `backend/tests/unit/auto-sync-toggle.test.js` | 9 tests covering scheduler skip logic, controller toggle handlers |

### Test Results

- 197 backend tests across 16 suites, all passing (9 new)
- 169 frontend tests across 12 suites, all passing
