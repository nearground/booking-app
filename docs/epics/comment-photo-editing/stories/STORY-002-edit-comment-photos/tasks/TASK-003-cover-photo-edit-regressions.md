---
title: "Cover photo edit and removal flows in component tests"
work_id: "EPIC-comment-photo-editing/STORY-002/TASK-003"
work_type: task
template_version: 1
status: done
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

- [x] Photo-edit acceptance scenarios have recorded results.
- [x] Targeted component coverage passes and existing upload behavior remains intact.
- [x] Payload contract and validation evidence are recorded.

## Documentation updates

Record the final payload shape and test evidence in this Task.

## Progress and completion evidence

`frontend/src/components/comments/AddCommentForm.test.jsx`: 8/8 passed. Coverage includes remove one, remove all, retain multiple, upload-plus-remove, and unchanged image set with canonical `imageKey` serialization. `CommentCard.test.jsx`: 4/4 passed; image display remains URL-based. Full `npx vitest --run`: 26 files passed, 1 pre-existing Login.test.jsx failure (expects a development-only username hint); 228 tests passed, 1 failed. Cypress component invocation was attempted, but repository Cypress config fails to load (`exports is not defined in ES module scope`); the named `.test.jsx` files use Vitest globals and no comment Cypress component specs exist. Frontend production build passes.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-comment-photo-editing/STORY-002/TASK-003` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
