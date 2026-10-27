---
title: "Edit comments with photos"
work_id: "EPIC-comment-photo-editing/STORY-002"
work_type: story
template_version: 1
status: done
parent: "EPIC-comment-photo-editing"
branch: "epic/comment-photo-editing"
depends_on: []
---

# Edit comments with photos

Parent Epic: [EPIC-comment-photo-editing](../../index.md)

## User value

As an authenticated comment owner, I want to remove, retain, or add photos while editing my comment, so that I can update the text and photo set without the server rejecting valid remaining images.

## Scope and non-goals

Trace the current API response image representation through CommentCard and AddCommentForm into PUT /api/comments/:id. Reproduce the reported rejection with a service unit test before changing implementation, then support allowed stored-key/public-URL forms while preserving the ten-image limit, media allow-list, edit ownership, and accessible text. Do not add pinning or alter public comment reads.

## Acceptance criteria

- [x] Given a top-level image comment has one or more valid stored review-image keys and is returned with resolved public imageUrl values, when its owner removes one photo, removes all photos, retains multiple photos, or combines a new upload with removal and saves, then the update persists exactly the remaining images, while malformed, external, disallowed, and over-limit values are still rejected.
- Epic acceptance coverage: Covers successful photo editing and bounded media round-tripping, plus regression cases for remove-one/all, multiple retained images, upload-plus-remove, and unchanged image comments.

## Ownership and dependencies

Own backend/server/services/Comment.service.js and comment service unit tests, plus frontend/src/components/comments/AddCommentForm.jsx and its component tests when required. Keep backend media allow-list and ownership constraints authoritative. Task 2 depends on Task 1 reproduction; Task 3 depends on Task 2.

## Tasks

<!-- children:start -->
- [TASK-001: Reproduce photo removal failure with response-shaped payloads](tasks/TASK-001-reproduce-photo-update-failure.md)
- [TASK-002: Normalize retained photo URLs without weakening validation](tasks/TASK-002-normalize-retained-photo-urls.md)
- [TASK-003: Cover photo edit and removal flows in component tests](tasks/TASK-003-cover-photo-edit-regressions.md)
<!-- children:end -->

## Verification and completion evidence

Run backend/tests/unit/comment-service.test.js, frontend AddCommentForm.test.jsx and CommentCard.test.jsx; assert exact PUT payload and persisted normalized image objects, then run all required package test commands.

## Progress and decisions

- Completed: API responses expose a canonical image key for edit payloads while retaining display URLs; invalid and external URLs remain rejected. Backend tests passed 21/21, and focused AddCommentForm/CommentCard tests passed 12/12.