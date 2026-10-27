---
title: "Document supported viewport and orientation coverage"
work_id: "EPIC-responsive-ux/STORY-003/TASK-001"
work_type: task
template_version: 1
status: in-progress
parent: "EPIC-responsive-ux/STORY-003"
branch: "epic/responsive-ux"
depends_on: []
---

# Document supported viewport and orientation coverage

Parent User Story: [EPIC-responsive-ux/STORY-003](../index.md)

## Overview and acceptance coverage

Publish an explicit target matrix used by QA and Cypress; covers Epic matrix documentation requirement.

## Requirements and current state

Epic proposes 360x740, 390x844, 768x1024, 1024x768 landscape, 1280x800, 1920x1080, and a foldable around 673x841. Matrix must identify orientation, CSS viewport rationale, and no device-specific guarantee beyond layout coverage.

## Implementation steps

1. Create docs/reference/responsive-device-matrix.md with each viewport, orientation, route coverage, interaction/accessibility checks, and execution instructions.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| docs/reference/responsive-device-matrix.md | Add owned matrix and test protocol reference. | Only this Epic folder for planning; reference doc is explicitly authorized by Epic. |

## Dependencies

None.

## Testing

- Unit: Documentation-only; no unit test required.
- Integration: Ensure viewport Cypress spec refers to documented sizes.
- Manual/UX: Review dimensions for portrait and landscape coverage.
- Regression coverage: Confirm doc states comments are deferred until the editing branch is merged.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

This task creates the required reference document.

## Progress and completion evidence

Implementation active; validate matrix matches Cypress dimensions.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-003/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
