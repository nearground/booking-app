---
title: "Comment privacy and photo editing"
work_id: "EPIC-comment-photo-editing"
work_type: epic
template_version: 1
status: done
parent: null
branch: "epic/comment-photo-editing"
depends_on: []
---

# Comment privacy and photo editing

## Outcome and MVP traceability

Only authenticated users see comment-composition UI, and an owner can remove a photo from an image-bearing comment and save remaining photos successfully.

## Scope and non-goals

In scope: hide composer while logged out (public reading stays available); support image-comment editing; correct serialization/validation and add regression tests. UI: `frontend/src/routes/experience-details/ExperienceDetails.jsx`, `CommentsModal.jsx`, `frontend/src/components/comments/AddCommentForm.jsx`, `CommentCard.jsx`; API `backend/server/routes/comments.js`. `validateImages` in `backend/server/services/Comment.service.js` returns `Maximum 10 images allowed, each must have a valid imageUrl` for malformed or unconfigured absolute URLs. The UI originally replayed API-exposed public URLs on edit, making updates dependent on exact `MEDIA_PUBLIC_BASE_URL` matching. The configured local base round-trips; an external-base mismatch reproduces the reported 400. Responses now expose the validated stored `imageKey`, and the UI submits that key while continuing to display `imageUrl`. The backend still enforces the media prefix allow-list, image count, and authorization; `Comment.model.js` separately enforces array/max length.

## Acceptance criteria

- [x] Logged-out visitors can read comments and see only a small, unobtrusive "Log in to comment" text link in place of the composer (all entry points, including `CommentsModal`); it returns them to the same experience after login. Authenticated controls remain.
- [x] Owner removes a photo and saves: only remaining valid images persist and save succeeds.
- [x] Supported media URL forms round-trip; malformed/external/disallowed paths and >10 images remain rejected.
- [x] Tests cover remove one/all, retain multiple, upload-plus-remove, and unchanged image comment.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/routes/experience-details/**`; `frontend/src/components/comments/**`; `backend/server/services/Comment.service.js`; comment controller only if needed; comment unit/component tests.
- Shared files/contracts and owner: This Epic owns image serialization/validation round-trip; backend media ownership/path allow-list remains authoritative. Do not change public read access or comment authorization. Coordinate shared ExperienceDetails edits with Epic 4/5.
- Parallel-ready assessment: Parallel-ready from confirmed baseline, but shares ExperienceDetails and comments components with Epics 4/5; coordinate UI integration instead of assuming no conflicts.

## Dependencies and integration

No formal dependency. Agree a narrow composer visibility/edit API boundary with concurrent details-page changes.

## User Stories

The Epic is expanded into two Stories and four implementation Tasks; all are complete and merged into main.

<!-- children:start -->
- [STORY-001: Comment only after sign-in](stories/STORY-001-authenticated-commenting/index.md)
- [STORY-002: Edit comments with photos](stories/STORY-002-edit-comment-photos/index.md)
<!-- children:end -->

## Risks, assumptions and open questions

- Decided: logged-out visitors see only a small "Log in to comment" text in place of the composer, in every comment entry point.
- Assumption: guest comments remain disabled and image uploads authenticated.

## Verification and completion evidence

Run `AddCommentForm.test.jsx`, `CommentCard.test.jsx`, guest prompt entry-point tests, and `backend/tests/unit/comment-service.test.js`; verify the canonical response key and rejection of external media URLs.

Wave 1 release verification: full backend suite passed (357 tests excluding the separately run database-free OpenAPI check); full frontend unit suite passed (283 tests). Responsive comments browser checks passed (11). The earlier Cypress configuration blocker and Login test failure are resolved on main. Photo-editing/auth contracts remain intact.

## Progress and decisions

- Expanded into Stories 001–002 and Tasks 001–004; all Stories and Tasks are complete. Backend Jest passed 266/266; frontend build passed. Full Vitest: 28 files passed, 1 unrelated pre-existing Login.test.jsx failure (230 passed, 1 failed). Cypress component testing was attempted but is blocked by the existing ESM/CJS config-load error; the named component test files use Vitest.
- 2026-10-26: User decided logged-out UX: small unobtrusive "Log in to comment" text.
