# 003 — Experience Tab Editing (Reuse CreateExperience Component)

**Estimated Difficulty:** 8

## Overview

Enable editing of existing experiences from the Experiences tab in the organizer profile by reusing the `CreateExperience` multi-step form component. When the schedule is changed during edit mode, display an alert notifying the organizer that the schedule must be synced manually from the Experiences tab. Refactor `CreateExperience` as needed to support both create and edit modes cohesively.

## Requirements

### Functional Requirements

1. Each experience card in the Experiences tab (see task 002) has an "Edit" action.
2. Clicking "Edit" opens the `CreateExperience` component in **edit mode**, pre-populated with the experience's current data.
3. Edit mode loads and pre-fills all form steps: Core details, Schedule, Tiers, and Questions.
4. On save, the component calls `PATCH /api/manage/experiences/:id` (the existing `updateExperience()` endpoint).
5. If the schedule (cron expression, templates, or picked occurrences) is modified during editing, display an **alert banner**: *"Schedule has been modified. You must manually sync the schedule from the Experiences tab for changes to take effect."*
6. The alert must be dismissible but persist until the user navigates away or syncs.
7. Create mode continues to function identically (no regression).

### Non-Functional Requirements

- `CreateExperience` refactoring must not break existing create flow or its preview functionality.
- Shared validation logic between create and edit modes.
- Schedule change detection should compare the original schedule data against the current form state (deep equality check).

## Current State

- **`CreateExperience.jsx`**: Multi-step form at `/create-experience`. Steps: Core → Schedule → Tiers → Questions → Preview. Submits via `POST /api/manage/experiences/` to create a new experience. Accepts `previewData` and `isPreview` props for preview rendering.
- **`ScheduleBuilder.jsx`**: Renders `TemplateEditor` (cron-based) and `PickedEditor` (one-off dates). Manages an array of schedule items.
- **`ExperienceManage.controller.js`**: `createExperience()` handles POST; `updateExperience()` handles PATCH for existing experiences; `syncManagedSchedule()` handles manual schedule sync trigger.
- **Backend route**: `PATCH /api/manage/experiences/:id` already exists and supports updating experience fields.
- **No edit mode** currently exists on the frontend — there is no way to edit an experience through the UI after creation.

## Implementation Steps

### Frontend Changes

#### 1. Refactor `CreateExperience.jsx` for Dual Mode
- Accept a new prop: `mode` (`'create'` | `'edit'`), defaulting to `'create'`.
- Accept an optional `experienceData` prop containing the existing experience to edit.
- When `mode === 'edit'`:
  - Pre-populate all form steps from `experienceData`.
  - Change the page title from "Create Experience" to "Edit Experience".
  - Change the submit button label from "Create" to "Save Changes".
  - Submit to `PATCH /api/manage/experiences/:id` instead of `POST`.

#### 2. Create Edit Experience Route
- Add route `/edit-experience/:experienceId` protected by `RequireOrganizer`.
- This route component fetches the experience data via `GET /api/experiences/:code` (or a manage endpoint) and passes it to `CreateExperience` in edit mode.
- Show a loader while fetching experience data.

#### 3. Pre-populate Form Steps
- **Core step**: Set `title`, `subtitle`, `description`, `capacity`, `duration`, `location`, `thumbnail`, `images`.
- **Schedule step**: Convert existing `ScheduleTemplate` and `PickedOccurrence` data back into the `ScheduleBuilder` item format. Store the original schedule state for change detection.
- **Tiers step**: Map existing `TicketTier` records into the tier form fields.
- **Questions step**: Map existing `userQuestionnary` JSON into the questionnaire builder.

#### 4. Schedule Change Detection & Alert
- On `ScheduleBuilder` mount in edit mode, snapshot the initial schedule state.
- On any schedule modification, deep-compare current state vs. snapshot.
- If changed, render a yellow alert banner above the form: *"Schedule has been modified. You must manually sync the schedule from the Experiences tab for changes to take effect."*
- Use the existing `Toast` component pattern or an inline alert (Tailwind: `bg-yellow-50 border-yellow-400 text-yellow-800 p-4 rounded`).

#### 5. Wire "Edit" Button in `OrgExperiencesPanel`
- The "Edit" button (from task 002) navigates to `/edit-experience/:experienceId`.
- Pass experience code or ID in the route params.

### Backend Changes

#### 6. (If needed) Ensure `updateExperience()` Accepts All Fields
- Verify that `PATCH /api/manage/experiences/:id` accepts and processes: title, subtitle, description, capacity, duration, scheduling changes, ticket tiers, questionnaires, images, thumbnail.
- If the endpoint currently only supports partial fields, extend it to handle the full experience object.

#### 7. (If needed) Add Manage-Level GET Endpoint
- If `GET /api/experiences/:code` doesn't return editable fields (like `ScheduleTemplate` or `PickedOccurrence` associations), add a `GET /api/manage/experiences/:id` endpoint that returns the full experience with all associations needed for editing.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `frontend/src/routes/create-experience/CreateExperience.jsx` |
| Create | `frontend/src/routes/edit-experience/EditExperience.jsx` (route wrapper) |
| Modify | `frontend/src/main.jsx` (add `/edit-experience/:experienceId` route) |
| Modify | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` (wire Edit button) |
| Modify | `frontend/src/components/schedule-builder/ScheduleBuilder.jsx` (schedule snapshot & change detection) |
| Modify (if needed) | `backend/server/controllers/ExperienceManage.controller.js` |
| Create (if needed) | `backend/server/controllers/ExperienceManage.controller.js` — `getExperienceForEdit()` |

## Definition of Done

- [x] "Edit" button on experience card navigates to edit mode.
- [x] `CreateExperience` renders in edit mode with all fields pre-populated.
- [x] Title, button labels, and API call differ between create and edit modes.
- [x] Schedule change detection works: modifying the schedule shows the alert banner.
- [x] Saving in edit mode calls `PATCH` and successfully updates the experience.
- [x] Create mode is unaffected (no regression).
- [x] Preview mode works in both create and edit contexts.
- [x] All existing tests pass; new tests cover edit mode flows.
- [x] Technical documentation updated.

## Implementation Notes

### Backend
- Added `GET /api/experiences/manage/:experienceId` — protected by `authUser` + `requireExperienceOrganizationAdmin`. Returns full experience with `ScheduleTemplates`, `PickedOccurrences`, `TicketTiers`, `Organizers`, `Location`.
- `updateExperience` (PATCH) already handled all fields (core, schedules, tiers, questionnary) — no changes needed.

### Frontend
- `CreateExperience.jsx` now accepts `mode` (`'create'` | `'edit'`) and `experienceData` props.
- Helper functions added: `buildSchedulesFromExperienceData`, `buildTiersFromExperienceData`, `serializeSchedules`.
- Schedule change detection: stores `originalScheduleSnapshotRef` on mount; `setField('schedules', ...)` compares new state to snapshot.
- Yellow alert banner shown when `scheduleChangedFromOriginal && !scheduleBannerDismissed`.
- On save, navigates to `/organizer-profile?tab=Experiences`.
- `EditExperience.jsx` route wrapper fetches experience via `GET /api/experiences/manage/:id`, shows loader and error states.
- Route `/edit-experience/:experienceId` added to `main.jsx` under `RequireOrganizer`.
- `OrgExperiencesPanel` "Edit" button replaced with a `<Link to="/edit-experience/:id" />`. Inline edit form fields removed; schedule operations (Sync, Populate, Update Start Date) retained under "Schedule" toggle button.

### Test Files Added
- `frontend/src/routes/create-experience/CreateExperience.test.jsx` — 8 tests (create mode + edit mode)
- `frontend/src/routes/edit-experience/EditExperience.test.jsx` — 5 tests (loading, error, success, invalid ID)
- `backend/tests/unit/experience-manage-get.test.js` — 4 tests (400/404/403/200)

### Validation Commands
```bash
# Frontend (209 tests across 23 files)
cd frontend && npm run test:unit -- --run

# Backend new tests (4 tests)
cd backend && npm test -- --runInBand tests/unit/experience-manage-get.test.js
```

## Testing

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `CreateExperience.test.jsx` | Renders "Create Experience" title in create mode; renders "Edit Experience" title when `mode='edit'`; pre-populates core fields from `experienceData`; submits POST in create mode; submits PATCH in edit mode; schedule change alert appears when schedule is modified in edit mode; alert does not appear in create mode |
| `EditExperience.test.jsx` | Fetches experience data on mount; renders loader while fetching; passes data to `CreateExperience` in edit mode; handles fetch error gracefully |
| `ScheduleBuilder.test.jsx` | Snapshots initial schedule state in edit mode; detects schedule changes via deep comparison; does not show alert when schedule unchanged |

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/experience-manage-controller.test.js` | `updateExperience()` updates all fields; returns 404 for non-existent experience; validates required fields; handles partial updates |

### Integration Tests

- Navigate to edit experience → modify title → save → verify title updated via GET.
- Navigate to edit experience → modify schedule → verify alert banner appears → save → verify alert persists.
- Create new experience → verify create flow unaffected.

### Manual Verification

1. From Experiences tab, click "Edit" on an experience → verify form pre-fills.
2. Modify the title and save → verify change persists.
3. Modify the schedule → verify yellow alert banner appears.
4. Navigate to `/create-experience` → verify create flow unchanged.
5. Test with an experience that has multiple ticket tiers and questionnaires → verify all populate correctly.

## Documentation Updates

- **`docs/architecture-diagrams.md`**: Add the `/edit-experience/:experienceId` route to the Frontend Route Tree diagram.
- **`backend/docs/`**: Document the `PATCH /api/manage/experiences/:id` request/response schema if not already documented.
- **Frontend component docs**: Document the `mode` and `experienceData` props on `CreateExperience`.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
