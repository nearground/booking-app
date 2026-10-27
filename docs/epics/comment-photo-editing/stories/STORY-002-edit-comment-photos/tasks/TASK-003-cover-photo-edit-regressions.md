---
title: "Cover photo edit and removal flows in component tests"
work_id: "EPIC-comment-photo-editing/STORY-002/TASK-003"
work_type: task
template_version: 1
status: ready
parent: "EPIC-comment-photo-editing/STORY-002"
branch: "epic/comment-photo-editing"
depends_on: []
---

# Cover photo edit and removal flows in component tests

Parent User Story: [EPIC-comment-photo-editing/STORY-002](../index.md)

## Overview and acceptance coverage

Exercise the existing-image edit workflow at the component boundary so the exact payload representation and intended remaining set are protected from future regressions.

## Requirements and current state

AddCommentForm initializes existingImages from initial.images, removes entries by index, and serializes retained objects as {imageUrl, accessibleText}; it appends uploaded URL objects and calls networkAdapter.put with images. Existing AddCommentForm component tests currently cover upload-on-create but not update/remove.

## Implementation steps

1. Extend AddCommentForm.test.jsx with an edit initial image set and mocked PUT; assert removing one photo sends only remaining image objects; cover remove-all, retained multiples, upload plus removal, and unchanged images without relying on presentation styling.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/components/comments/AddCommentForm.test.jsx | Add assertions over networkAdapter.put payload and preserve existing accessibleText values. | Match backend accepted API contract; do not change unrelated styling or include preview blob URLs in PUT. |

## Dependencies

Depends on STORY-002/TASK-002 so the expected backend URL contract is established.

## Testing

- Unit: Run focused AddCommentForm.test.jsx via Vitest.
- Integration: Run frontend npx vitest --run and configured Cypress component tests.
- Manual/UX: Inspect existing image removal and addition affordances; no shared Docker or API write needed.
- Regression coverage: Test remove one, all, retain multiple, upload-plus-remove, unchanged images, and exact imageUrl/accessibility payload shape.

## Definition of Done

- [ ] Story acceptance criteria covered with recorded results.
- [ ] Targeted checks pass; existing intended behavior is preserved.
- [ ] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Record the final payload shape and test evidence in this Task.

## Progress and completion evidence

Pending implementation after Task 2.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-comment-photo-editing/STORY-002/TASK-003` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
