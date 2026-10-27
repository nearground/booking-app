---
title: "Keep the comment composer usable with mobile keyboards"
work_id: "EPIC-responsive-ux/STORY-004/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-responsive-ux/STORY-004"
branch: "epic/responsive-ux"
depends_on: ["EPIC-responsive-ux/STORY-004/TASK-001"]
---

# Keep the comment composer usable with mobile keyboards

Parent User Story: [EPIC-responsive-ux/STORY-004](../index.md)

## Overview and acceptance coverage

Completed after the comment-photo-editing merge; canonical retained-photo submissions are preserved.

## Requirements and current state

Comment composer code is under frontend/src/components/comments/**. It now uses labeled controls, wrapping actions, bounded photo controls and document/container scrolling instead of fixed-height reply clipping.

## Implementation steps

1. After merge, verify textarea/composer remains visible above mobile keyboard and save/cancel actions meet touch target size; adjust CSS only unless agreed otherwise.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/comments/** | Scroll-flow composer, labeled fields and wrapping touch actions. | Preserve submission, auth and canonical photo-edit payloads. |

## Dependencies

comment-photo-editing branch merge; TASK-001 comments layout.

## Testing

- Unit: Existing composer/component tests pass with labeled-control assertions.
- Integration: Three reduced-height/desktop editing cases pass with exact submitted text and image payload assertions.
- Manual/UX: Physical keyboard remains a manual launch check; browser coverage uses reduced available height.
- Regression coverage: Submit/cancel, image removal/retention/upload and visible errors remain covered.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Record composer behavior in responsive matrix notes after implementation.

## Progress and completion evidence

Completed. Browser tests at 360x420 (reduced keyboard-sized viewport), 844x390 and 1280x800 focus/type into the editor, remove a retained image, scroll to the update control, and verify the submitted text and empty image array. Actions are at least 44px. Unit tests cover retained-key round trips, upload/removal, labels and API errors. Physical-device keyboard behavior remains a manual launch check, not an automated hardware claim.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-004/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
