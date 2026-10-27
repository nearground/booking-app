---
title: "Build the organizer branding editor"
work_id: "EPIC-organization-profile-sites/STORY-001/TASK-002"
work_type: task
template_version: 1
status: in-progress
parent: "EPIC-organization-profile-sites/STORY-001"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Build the organizer branding editor

Parent User Story: [EPIC-organization-profile-sites/STORY-001](../index.md)

## Overview and acceptance coverage

Give organization admins an organizer-area form to edit branding and choose fixed templates.

## Requirements and current state

Organizer profile UI is under frontend/src/routes/organizer-profile/. Use existing auth/API conventions and upload controls. Show safe defaults, validate before submit, display server errors, and omit raw HTML/CSS/script inputs.

## Implementation steps

1. Inspect organizer profile routing/components and media upload widgets, then add editor saving through the admin endpoint.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/routes/organizer-profile/** | Add editor controls, upload references and form feedback. | Reuse UI conventions and existing upload pipeline; no arbitrary markup. |

## Dependencies

Depends on STORY-001/TASK-001 API/schema contract.

## Testing

- Unit: Vitest: defaults, validation, template choice, save/error states and admin-only visibility.
- Integration: Frontend tests/build validate organizer route and API payload.
- Manual/UX: Admin edits/saves; non-admin has no edit affordance and API rejects writes.
- Regression coverage: Preserve existing organizer profile behavior.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Update story evidence after implementation.

## Progress and completion evidence

In progress; record component/build evidence.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-organization-profile-sites/STORY-001/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
