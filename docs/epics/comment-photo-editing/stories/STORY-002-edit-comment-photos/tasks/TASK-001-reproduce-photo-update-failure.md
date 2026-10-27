---
title: "Reproduce photo removal failure with response-shaped payloads"
work_id: "EPIC-comment-photo-editing/STORY-002/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-comment-photo-editing/STORY-002"
branch: "epic/comment-photo-editing"
depends_on: []
---

# Reproduce photo removal failure with response-shaped payloads

Parent User Story: [EPIC-comment-photo-editing/STORY-002](../index.md)

## Overview and acceptance coverage

Write the first failing service regression for the actual edit payload shape: API response exposes images as objects containing resolved absolute imageUrl and optional accessibleText; AddCommentForm retains and resubmits those objects after removal via PUT /api/comments/:id. Establish the exact failing shape before a production fix.

## Requirements and current state

Comment.service.js validateImages accepts object entries, checks absolute URLs against MEDIA_PUBLIC_BASE_URL, then calls toStoredReviewImageValue and the allowed-key prefix check. Existing service tests cover stored-key objects but not edit round-trip of public URLs or URL encoding. The frontend forms [{imageUrl, accessibleText}] for retained existing images followed by newly uploaded [{imageUrl}] objects.

## Implementation steps

1. Add updateComment unit coverage using the response-shaped image objects and assert service result/status and the exact sanitized images passed to existing.update; run it before changing production code and record observed failure plus frontend payload shape.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/tests/unit/comment-service.test.js and frontend/src/components/comments/AddCommentForm.test.jsx | Assert response shape and exact object-valued PUT payload after removal. | Preserve media allow-list and ownership checks. |

## Dependencies

None; this is the prerequisite reproduction for TASK-002.

## Testing

- Unit: Run the focused comment-service Jest file and record pre-fix failure.
- Integration: Use AddCommentForm.test.jsx to capture the concrete client PUT payload when feasible.
- Manual/UX: Compare service input shape to Comment.service.js mapReviewImagesForResponse output; avoid creating persistent API data.
- Regression coverage: Include a retained response URL after a removal and verify the current validation result; capture exact URL and object representation.

## Definition of Done

- [x] Response-to-update payload and failing round-trip condition captured.
- [x] The configured public URL and external-base rejection behavior are recorded without changing validation.
- [x] The remaining base-configuration question is recorded as an open risk.

## Documentation updates

Record the reproduced shape and failure evidence in this Task before completing it.

## Progress and completion evidence

Payload capture: AddCommentForm resubmits `images` as objects, e.g. `{ imageUrl: "http://localhost:4000/api/media/object/users/10/review-image/retain.jpg", accessibleText: "Keep this" }`. Frontend component test passed 5/5. Backend baseline: configured default URL is accepted and normalizes to `users/10/review-image/retained.jpg`; a URL outside configured `MEDIA_PUBLIC_BASE_URL` is rejected with exactly `Maximum 10 images allowed, each must have a valid imageUrl`. The new round-trip test is intentionally red (20 passed, 1 failed) because API response images do not expose the stored key needed to avoid replaying a public URL. `MEDIA_PUBLIC_BASE_URL` is unset in this worktree (default applies); backend .env absent. The read-only dev API probe returned 500, so deployment-specific public URL configuration remains unverified. Next task adds an explicit canonical key while retaining server allow-list checks.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-comment-photo-editing/STORY-002/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
