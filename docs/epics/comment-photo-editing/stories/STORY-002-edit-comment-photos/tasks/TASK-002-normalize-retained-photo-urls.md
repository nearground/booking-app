---
title: "Normalize retained photo URLs without weakening validation"
work_id: "EPIC-comment-photo-editing/STORY-002/TASK-002"
work_type: task
template_version: 1
status: done
parent: "EPIC-comment-photo-editing/STORY-002"
branch: "epic/comment-photo-editing"
depends_on: []
---

# Normalize retained photo URLs without weakening validation

Parent User Story: [EPIC-comment-photo-editing/STORY-002](../index.md)

## Overview and acceptance coverage

Fix the confirmed source of rejected valid retained images in the service normalization path, then prove supported response URLs round-trip without reducing path checks, image count, or edit authorization.

## Requirements and current state

The service returns imageUrl values through resolveMediaUrl and update validates the submitted images through normalizeStoredMediaValue and isAllowedReviewImageKey. Support only canonical configured media URL forms and safe stored keys; malformed or foreign absolute URLs and keys outside users/, orgs/, experiences/, hotels/ stay rejected.

## Implementation steps

1. Use Task 1 failure evidence to correct URL-to-storage-key normalization at the narrowest boundary; preserve all existing checks; add tests for allowed response URL and stored key while asserting external/disallowed values fail.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| backend/server/services/Comment.service.js | Correct retained image value conversion when evidence identifies the canonical URL representation. | No weakening of MEDIA_PUBLIC_BASE_URL origin/path matching, allowed key prefixes, max count, or comment owner checks. |

## Dependencies

Depends on STORY-002/TASK-001 reproduction.

## Testing

- Unit: Run backend/tests/unit/comment-service.test.js using Jest.
- Integration: Run backend npx jest after dependency installation.
- Manual/UX: If useful, read-only inspect running dev API; never create persistent junk data or run migrations/seeders against shared DB.
- Regression coverage: Prove remove-one, remove-all, retain-multiple, upload-plus-remove, unchanged image set, and rejection of malformed/external/disallowed/over-limit images.

## Definition of Done

- [x] Canonical image-key round-trip implemented with response-URL compatibility preserved.
- [x] Configured URLs and stored keys pass; URLs outside configured public base remain rejected.
- [x] Completion evidence and remaining integration risk recorded.

## Documentation updates

Record confirmed root cause, supported forms, and test evidence in this Task.

## Progress and completion evidence

Root cause: comment responses exposed only a resolved public imageUrl and AddCommentForm replayed it on PUT; validateImages accepts absolute URLs only under the backend configured MEDIA_PUBLIC_BASE_URL. The default local URL round-trips, but a stale/re-written public host reproduces the exact 400 validation message. The API now returns both imageUrl (for display) and imageKey (canonical storage value); edits and new uploads submit the key. Existing backend allow-list, image-count limit, and upload ownership behavior are unchanged. `npx jest tests/unit/comment-service.test.js --runInBand`: 21/21 passed, including configured URL acceptance, external-base rejection, and imageKey response. Frontend AddCommentForm tests: 5/5 passed, asserting the PUT contains the key rather than resolved URL.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-comment-photo-editing/STORY-002/TASK-002` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
