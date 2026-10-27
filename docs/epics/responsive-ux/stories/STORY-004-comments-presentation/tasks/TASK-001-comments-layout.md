---
title: "Adapt comment threads, photos, and affordances for narrow screens"
work_id: "EPIC-responsive-ux/STORY-004/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-responsive-ux/STORY-004"
branch: "epic/responsive-ux"
depends_on: []
---

# Adapt comment threads, photos, and affordances for narrow screens

Parent User Story: [EPIC-responsive-ux/STORY-004](../index.md)

## Overview and acceptance coverage

Completed after the comment-photo-editing merge; responsive presentation and explicit UI failure states only.

## Requirements and current state

Comment components are in frontend/src/components/comments/**. The photo-editing interface is merged and stable, so responsive updates preserve its canonical media keys and auth behavior.

## Implementation steps

1. After dependency merge, adapt comment card widths, thread indentation, responsive photo thumbnails/viewer affordances, and action target sizes without changing APIs or auth.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/comments/** | Responsive cards, threads, photos, actions and visible error states. | Preserve photo-edit/auth contracts; pinned-comments remains later work. |

## Dependencies

comment-photo-editing branch merge and interface stabilization.

## Testing

- Unit: Comments, gallery and modal component suites pass.
- Integration: Comments viewport suite passes all 11 checks.
- Manual/UX: Real-phone/LAN/keyboard checks remain manual launch checks.
- Regression coverage: Canonical photo edits, guest prompts, nested focus/scroll and error alerts remain covered.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Update matrix or comments UX notes after dependency merges.

## Progress and completion evidence

Completed. Cards and replies wrap long names/text without overflow, thread indentation is reduced on phones, photo thumbnails reserve space, and actions meet 44px targets. Review dialogs use the shared dynamic-viewport/focus helper; nested galleries close one level at a time and restore focus/scroll. Loading/deletion failures display alerts instead of false empty results. All eight viewport sizes pass the comments browser checks; focused component tests preserve photo editing and guest login prompts. Production pinning remains outside Wave 1.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-004/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
