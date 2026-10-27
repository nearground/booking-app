---
title: "Comment only after sign-in"
work_id: "EPIC-comment-photo-editing/STORY-001"
work_type: story
template_version: 1
status: done
parent: "EPIC-comment-photo-editing"
branch: "epic/comment-photo-editing"
depends_on: []
---

# Comment only after sign-in

Parent Epic: [EPIC-comment-photo-editing](../../index.md)

## User value

As a visitor, I want to comment on an experience only after signing in, so that my reviews and replies are tied to my account.

## Scope and non-goals

Replace the top-level review composer on ExperienceDetails with a subtle “Log in to comment” link for visitors without userDetails. Keep comments and photo viewing public. Link through the application login route with the current experience URL as the return destination. Reply, edit, and delete controls must remain unavailable to guests; do not add a composer to CommentsModal.

## Acceptance criteria

- [x] Given a visitor is viewing an experience while logged out, when they reach the review composer area or open the all-comments modal, then they see only a small “Log in to comment” link in the composer area, and after login can return to that experience while continuing to read public comments.
- Epic acceptance coverage: Covers the Epic criterion requiring a return-aware guest login link at every comment composition entry point while preserving public reading.

## Ownership and dependencies

Own frontend/src/routes/experience-details/ExperienceDetails.jsx and, only if needed, comment component entry points/tests. Keep comments public; rely on userDetails to gate authenticated controls. No backend auth or route behavior changes. No formal dependencies.

## Tasks

<!-- children:start -->
- [TASK-001: Replace the guest composer with a return-aware login link](tasks/TASK-001-guest-comment-login.md)
<!-- children:end -->

## Verification and completion evidence

Run focused frontend Vitest and Cypress component checks for AddCommentForm/CommentCard plus any ExperienceDetails test added. Verify the login href preserves the current experience path.

## Progress and decisions

- Completed: a guest-only, return-aware login link appears at the ExperienceDetails, CommentsSection, and CommentsModal entry points; public reading remains available. Focused UI tests passed 4/4 across the guest prompt and its entry points.