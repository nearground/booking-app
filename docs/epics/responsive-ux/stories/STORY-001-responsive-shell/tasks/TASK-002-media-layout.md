---
title: "Stabilize responsive media and common page containers"
work_id: "EPIC-responsive-ux/STORY-001/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-responsive-ux/STORY-001"
branch: "epic/responsive-ux"
depends_on: []
---

# Stabilize responsive media and common page containers

Parent User Story: [EPIC-responsive-ux/STORY-001](../index.md)

## Overview and acceptance coverage

Reduce layout shift and prevent common media/container layouts from exceeding available width; covers Epic media acceptance.

## Requirements and current state

Images are rendered across shared image-card, hero-cover, experience/session cards, hotel cards, and image-gallery components. Prefer CSS aspect-ratio reservations and max-width constraints for existing sources; no media upload/CDN pipeline changes are authorized.

## Implementation steps

1. Audit shared card/hero/gallery image wrappers and assign intrinsic aspect-ratio or width/height-reserving classes at the presentation boundary.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/{image-card,hero-cover,experience-view-card,hotel-view-card}/** | Reserve image space and constrain media to its responsive card. | Presentation-only; do not modify comments or experience-details logic and do not invent srcset URLs. |

## Dependencies

Shared Tailwind/container tokens from STORY-001/TASK-001.

## Testing

- Unit: Run affected Vitest tests if component tests exist.
- Integration: Responsive Cypress spec checks no horizontal overflow on pages that show card imagery.
- Manual/UX: Compare layout before and after images load at mobile and desktop widths.
- Regression coverage: Verify image cropping and card links retain current behavior.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Document that responsive sources require support from the media pipeline; this task reserves layout space only.

## Progress and completion evidence

Completed: experience and hotel card media now reserve responsive aspect-ratio space and load lazily. Viewport Cypress assertions pass at all 8 sizes; no srcset variants were available in the current media pipeline.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-001/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
