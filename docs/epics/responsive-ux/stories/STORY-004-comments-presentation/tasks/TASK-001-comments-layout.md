---
title: "Adapt comment threads, photos, and affordances for narrow screens"
work_id: "EPIC-responsive-ux/STORY-004/TASK-001"
work_type: task
template_version: 1
status: draft
parent: "EPIC-responsive-ux/STORY-004"
branch: "epic/responsive-ux"
depends_on: []
---

# Adapt comment threads, photos, and affordances for narrow screens

Parent User Story: [EPIC-responsive-ux/STORY-004](../index.md)

## Overview and acceptance coverage

Deferred until the comment-photo-editing branch merges; presentation changes only.

## Requirements and current state

The current comment components are in frontend/src/components/comments/**. This branch is explicitly forbidden from editing them during the responsive pass because another branch is changing the same surface.

## Implementation steps

1. After dependency merge, adapt comment card widths, thread indentation, responsive photo thumbnails/viewer affordances, and action target sizes without changing APIs or auth.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/comments/** | Pending responsive presentation updates after merge. | Do not begin until comment-photo-editing branch lands; coordinate pinned-comments Epic. |

## Dependencies

comment-photo-editing branch merge and interface stabilization.

## Testing

- Unit: Pending; use existing comments component tests.
- Integration: Pending; use responsive Cypress coverage.
- Manual/UX: Pending; 360px and desktop.
- Regression coverage: Pending; preserve comment action behavior and loading/empty/error states.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Update matrix or comments UX notes after dependency merges.

## Progress and completion evidence

Deferred by instruction; no implementation or completion claim.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-004/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
