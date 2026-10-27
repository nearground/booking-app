---
title: "Render branded sites and experience cards"
work_id: "EPIC-organization-profile-sites/STORY-002/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-organization-profile-sites/STORY-002"
branch: "epic/organization-profile-sites"
depends_on: []
---

# Render branded sites and experience cards

Parent User Story: [EPIC-organization-profile-sites/STORY-002](../index.md)

## Overview and acceptance coverage

Render public API data in fixed accessible branded layouts with useful empty states.

## Requirements and current state

Add components under frontend/src/routes/organization-site/**. Use validated color CSS variables and allow-listed fonts, 2-3 hardcoded layouts, safe text rendering, and main-site experience links; never cross-origin booking form or arbitrary HTML/CSS/script.

## Implementation steps

1. Implement templates, shared data loading/error/empty states and public experience links using repository UI conventions.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/routes/organization-site/** | Add fixed layout templates and experience cards. | Bounded values only; actions link to puertovallarta.today. |

## Dependencies

Depends on STORY-002/TASK-001 public API contract.

## Testing

- Unit: Vitest: templates, defaults, sold-out labels, empty/loading/error states and safe text.
- Integration: Component integration checks confirm experience links target main site.
- Manual/UX: Review desktop/mobile populated and empty organization sites.
- Regression coverage: Preserve existing routes and booking behavior.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Capture templates in story progress/evidence.

## Progress and completion evidence

Completed. Three hardcoded layouts render validated branding and privacy-safe experience cards with sold-out labels, safe text and an empty state; experience actions point to puertovallarta.today. Vitest component suite passed: 13 tests across templates, cards and empty states. Frontend production build passed.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-organization-profile-sites/STORY-002/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
