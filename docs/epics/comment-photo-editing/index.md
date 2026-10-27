---
title: "Comment privacy and photo editing"
work_id: "EPIC-comment-photo-editing"
work_type: epic
template_version: 1
status: draft
parent: null
branch: "epic/comment-photo-editing"
depends_on: []
---

# Comment privacy and photo editing

## Outcome and MVP traceability

Only authenticated users see comment-composition UI, and an owner can remove a photo from an image-bearing comment and save remaining photos successfully.

## Scope and non-goals

In scope: hide composer while logged out (public reading stays available); support image-comment editing; correct serialization/validation and add regression tests. UI: `frontend/src/routes/experience-details/ExperienceDetails.jsx`, `CommentsModal.jsx`, `frontend/src/components/comments/AddCommentForm.jsx`, `CommentCard.jsx`; API `backend/server/routes/comments.js`. The error ?Maximum 10 images allowed, each must have a valid imageUrl? is returned by `validateImages` in `backend/server/services/Comment.service.js` on create and update. It accepts objects with `imageUrl`, normalizes media URLs and restricts stored keys. Likely cause: edit resubmits one or more API-exposed/public URL values in a representation or base-URL form not accepted by `toStoredReviewImageValue` / `isAllowedReviewImageKey`; the backend rejects the entire remaining array after a removal. Confirm exact failing payload/config before fix; do not weaken ownership or media allow-list. `Comment.model.js` separately enforces array/max length.

## Acceptance criteria

- [ ] Logged-out visitors can read comments and see only a small, unobtrusive "Log in to comment" text link in place of the composer (all entry points, including `CommentsModal`); it returns them to the same experience after login. Authenticated controls remain.
- [ ] Owner removes a photo and saves: only remaining valid images persist and save succeeds.
- [ ] Supported media URL forms round-trip; malformed/external/disallowed paths and >10 images remain rejected.
- [ ] Tests cover remove one/all, retain multiple, upload-plus-remove, and unchanged image comment.

## Branch independence and ownership

- Baseline: `main`. All Epic branches are created from the same `main` commit.
- Owned paths: `frontend/src/routes/experience-details/**`; `frontend/src/components/comments/**`; `backend/server/services/Comment.service.js`; comment controller only if needed; comment unit/component tests.
- Shared files/contracts and owner: This Epic owns image serialization/validation round-trip; backend media ownership/path allow-list remains authoritative. Do not change public read access or comment authorization. Coordinate shared ExperienceDetails edits with Epic 4/5.
- Parallel-ready assessment: Parallel-ready from confirmed baseline, but shares ExperienceDetails and comments components with Epics 4/5; coordinate UI integration instead of assuming no conflicts.

## Dependencies and integration

No formal dependency. Agree a narrow composer visibility/edit API boundary with concurrent details-page changes.

## User Stories

Children are created only when expansion is explicitly requested.

<!-- children:start -->
<!-- children:end -->

## Risks, assumptions and open questions

- Decided: logged-out visitors see only a small "Log in to comment" text in place of the composer, in every comment entry point.
- Assumption: guest comments remain disabled and image uploads authenticated.

## Verification and completion evidence

Run `AddCommentForm.test.jsx`, `CommentCard.test.jsx`, `backend/tests/unit/comment-service.test.js`; capture and test actual response-to-update URL shape, including media base configuration.

## Progress and decisions

- Draft created; not approved for implementation. No implementation evidence recorded.
- 2026-10-26: User decided logged-out UX: small unobtrusive "Log in to comment" text.
