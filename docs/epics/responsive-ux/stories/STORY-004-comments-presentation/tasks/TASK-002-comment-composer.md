---
title: "Keep the comment composer usable with mobile keyboards"
work_id: "EPIC-responsive-ux/STORY-004/TASK-002"
work_type: task
template_version: 1
status: draft
parent: "EPIC-responsive-ux/STORY-004"
branch: "epic/responsive-ux"
depends_on: []
---

# Keep the comment composer usable with mobile keyboards

Parent User Story: [EPIC-responsive-ux/STORY-004](../index.md)

## Overview and acceptance coverage

Deferred until the comment-photo-editing branch merges; composer implementation must not conflict with its changes.

## Requirements and current state

Comment composer code is under frontend/src/components/comments/** and is concurrently owned by comment-photo-editing branch.

## Implementation steps

1. After merge, verify textarea/composer remains visible above mobile keyboard and save/cancel actions meet touch target size; adjust CSS only unless agreed otherwise.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/comments/** | Pending mobile keyboard and action layout improvements. | No source edits until comment-photo-editing merges; do not modify submission, auth, or photo-edit logic. |

## Dependencies

comment-photo-editing branch merge; TASK-001 comments layout.

## Testing

- Unit: Pending; existing composer/component tests.
- Integration: Pending; viewport e2e after merge.
- Manual/UX: Pending; test mobile keyboard and narrow viewport.
- Regression coverage: Pending; ensure submit/cancel and edit/delete behavior is retained.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Record composer behavior in responsive matrix notes after implementation.

## Progress and completion evidence

Deferred by instruction; remains not started.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-responsive-ux/STORY-004/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.
<!-- children:start -->
<!-- children:end -->
