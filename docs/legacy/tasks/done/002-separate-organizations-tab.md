# 002 — Separate Organizations Tab into Organization & Experiences Tabs

**Estimated Difficulty:** 8

## Overview

Split the current "Organizations" sidebar section in the organizer profile into two distinct tabs: **"Organization"** for managing users and organization invites, and **"Experiences"** for managing experiences. Refactor code into reusable components with aesthetically pleasing layouts using modern UX/UI standards, leveraging existing Tailwind patterns and the `Tabs`/`TabPanel` UX component library.

## Requirements

### Functional Requirements

1. The organizer profile sidebar shows two entries where "Organizations" currently appears: **"Organization"** and **"Experiences"**.
2. **Organization tab** displays:
   - Organization details (name, email, location).
   - Member list with roles (admin vs. member).
   - Invite management: pending invites, send new invite (email + role), resend/cancel.
3. **Experiences tab** displays:
   - List of experiences owned by the organizer's organization(s).
   - Per-experience actions: view details, edit (see task 003), delete.
   - Experience status indicators (active, draft, etc.).
   - Session counts and upcoming session summaries.
4. Both tabs reuse the existing `Tabs` / `TabPanel` UX component pattern from `frontend/src/components/ux/tabs/`.
5. Extracted components are self-contained and reusable outside the organizer profile if needed.

### Non-Functional Requirements

- Responsive layout: works on desktop (sidebar + content) and mobile (stacked).
- Follow existing Tailwind utility class patterns (no new CSS files unless necessary).
- Loading states use skeleton patterns consistent with the rest of the app.
- Empty states provide clear CTAs (e.g., "No experiences yet — create one").

## Current State

- **`OrganizerProfile.jsx`**: Sidebar with sections: Dashboard, Scheduled Sessions, Comments, Organizations, Locations, Profile Details. The "Organizations" section renders `OrganizationAccordion`.
- **`OrganizationAccordion.jsx`**: A single expandable accordion per organization. Contains:
  - Organization metadata (name, email).
  - Invite management (send invite form with email + role, pending invite list).
  - Experience list within the same accordion body.
  - Edit organization form.
- **`Tabs` UX component**: Located at `frontend/src/components/ux/tabs/`. Accepts `initialActiveTab` prop and `<TabPanel label="..." icon={...}>` children. Already used elsewhere in the app.
- **Backend workspace endpoint**: `GET /api/organizers/workspace` returns organization data including members, invites, and experiences.

## Implementation Steps

### Frontend Changes

#### 1. Create `OrgMembersPanel` Component
- Extract member list and invite management from `OrganizationAccordion.jsx` into `frontend/src/routes/organizer-profile/components/OrgMembersPanel.jsx`.
- Props: `organization`, `members`, `invites`, `onInviteSent`, `onInviteCanceled`.
- Renders:
  - Organization info header (name, email, location).
  - Member cards in a grid layout (profile picture, name, role badge, admin indicator).
  - "Invite Member" form: email input + role dropdown + submit button.
  - Pending invites list with resend/cancel actions and expiration status.
- Use Tailwind `grid`, `gap`, `rounded-lg`, `shadow-sm` for card-based layouts.

#### 2. Create `OrgExperiencesPanel` Component
- Extract experience list from `OrganizationAccordion.jsx` into `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx`.
- Props: `experiences`, `organizationId`, `onDelete`, `onEdit`.
- Renders:
  - Experience cards in a responsive grid (thumbnail, title, status badge, session count).
  - Per-card actions: "Edit" button (navigates to edit mode — see task 003), "Delete" button (with confirmation modal).
  - Empty state: illustration + "Create your first experience" CTA linking to `/create-experience`.
  - Search/filter bar for experiences (by title, status).

#### 3. Update `OrganizerProfile.jsx` Sidebar
- Replace the single "Organizations" sidebar entry with two entries: "Organization" and "Experiences".
- Map sidebar selection to render `OrgMembersPanel` or `OrgExperiencesPanel` instead of `OrganizationAccordion`.
- If the organizer belongs to one organization, render panels directly. If multiple organizations exist (future-proofing), provide an org selector dropdown above the panels.

#### 4. Refactor `OrganizationAccordion.jsx`
- Remove inlined member/invite/experience management logic now extracted into `OrgMembersPanel` and `OrgExperiencesPanel`.
- Either deprecate the file entirely or refactor it to be a thin wrapper around the new panels for any remaining use cases.

#### 5. Style & Layout Polish
- Apply consistent card elevation (`shadow-sm` → `hover:shadow-md` transitions).
- Status badges: use Tailwind color coding (`bg-green-100 text-green-800` for active, `bg-yellow-100 text-yellow-800` for draft, etc.).
- Section headers with counts (e.g., "Members (5)", "Pending Invites (2)").
- Responsive breakpoints: single column on mobile (`grid-cols-1`), two columns on tablet (`md:grid-cols-2`), three on desktop (`lg:grid-cols-3`).

### Backend Changes

#### 6. (Optional) Extend Workspace Endpoint
- If the current `GET /api/organizers/workspace` response does not include sufficient experience metadata (session counts, status indicators), add those fields.
- Include `upcomingSessions` count per experience and `status` field.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `frontend/src/routes/organizer-profile/components/OrgMembersPanel.jsx` |
| Create | `frontend/src/routes/organizer-profile/components/OrgExperiencesPanel.jsx` |
| Modify | `frontend/src/routes/organizer-profile/OrganizerProfile.jsx` |
| Modify | `frontend/src/routes/organizer-profile/components/OrganizationAccordion.jsx` (deprecate or refactor) |
| Modify (optional) | `backend/server/controllers/Organizer.controller.js` — if workspace data needs enrichment |

## Definition of Done

- [x] Organizer profile sidebar shows separate "Organization" and "Experiences" entries.
- [x] "Organization" tab displays members, roles, and invite management.
- [x] "Experiences" tab displays experience cards with actions (edit, delete).
- [x] `OrgMembersPanel` and `OrgExperiencesPanel` are self-contained, reusable components.
- [x] Layout is responsive across desktop, tablet, and mobile breakpoints.
- [x] Empty states display meaningful CTAs.
- [x] Loading states use skeletons/loaders consistent with the app.
- [x] `OrganizationAccordion` is cleaned up (no dead code).
- [x] All existing tests pass; new tests cover extracted components.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `OrgMembersPanel.test.jsx` | Renders organization info header; renders member list with roles; renders pending invites; invite form submits with email + role; cancel invite calls callback; empty member state renders correctly |
| `OrgExperiencesPanel.test.jsx` | Renders experience cards with thumbnails and titles; "Edit" button navigates/calls handler; "Delete" shows confirmation; empty state renders CTA link; search filters experiences by title |
| `OrganizerProfile.test.jsx` | Sidebar shows "Organization" and "Experiences" entries; clicking "Organization" renders `OrgMembersPanel`; clicking "Experiences" renders `OrgExperiencesPanel`; default selection renders correctly |

### Integration Tests

- Load organizer profile with seeded data → verify both tabs render correct data from workspace API.
- Send invite from Organization tab → verify invite appears in pending list.
- Delete experience from Experiences tab → verify it is removed from the list.

### Manual Verification

1. Log in as an organizer → navigate to organizer profile.
2. Click "Organization" in sidebar → verify members and invites display.
3. Click "Experiences" in sidebar → verify experience list displays.
4. Send an invite → verify it appears under pending invites.
5. On mobile viewport → verify responsive layout stacks correctly.
6. With no experiences → verify empty state CTA.

## Implementation Notes

- OrganizerProfile now uses the shared `Tabs` / `TabPanel` pattern for all organizer sections, with separate top-level `Organization` and `Experiences` entries replacing the old combined accordion workflow.
- Added reusable `OrgMembersPanel` and `OrgExperiencesPanel` components with inline editing and schedule management preserved from the previous organizer workspace.
- Extended the backend workspace payload with `pendingInvites`, added invite cancellation, and added managed experience deletion that blocks removal when reservations exist.
- The `Edit` action in the new Experiences tab opens the existing inline editor card; task 003 will replace that editor surface with the shared create-experience flow.

## Validation

- Frontend: `npm run test:unit -- --run`
- Backend: `npm test -- --runInBand tests/unit/organizer-invite-cancel.test.js tests/unit/organizer-workspace.test.js`

## Documentation Updates

- **`docs/architecture-diagrams.md`**: No structural changes needed, but update the component dependency diagram if one exists for the organizer profile.
- **Frontend component docs**: Add JSDoc headers to `OrgMembersPanel` and `OrgExperiencesPanel` describing their props and usage.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
