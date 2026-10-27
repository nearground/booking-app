---
title: "Replace the guest composer with a return-aware login link"
work_id: "EPIC-comment-photo-editing/STORY-001/TASK-001"
work_type: task
template_version: 1
status: done
parent: "EPIC-comment-photo-editing/STORY-001"
branch: "epic/comment-photo-editing"
depends_on: []
---

# Replace the guest composer with a return-aware login link

Parent User Story: [EPIC-comment-photo-editing/STORY-001](../index.md)

## Overview and acceptance coverage

Meet Story 001 by replacing the guest-facing review composer with one unobtrusive login link that returns to the current experience; preserve public comment cards and modal reading.

## Requirements and current state

ExperienceDetails obtains userDetails from AuthContext and currently always renders AddCommentForm when no recent-review branch takes precedence. CommentsModal lists public CommentCards with userDetails=null and no composition affordance. CommentCard and CommentPreview already gate edit/reply/delete actions on userDetails. Verify the registration/login route convention before constructing the return path.

## Implementation steps

1. Inspect the app login route and use its supported return parameter for the current experience path; render “Log in to comment” instead of AddCommentForm for guests; add focused UI coverage ensuring no form is exposed to guests and comments remain visible.

## Files to create or modify

| Path | Change | Ownership/contract constraints |
|------|--------|--------------------------------|
| frontend/src/routes/experience-details/ExperienceDetails.jsx, CommentsModal.jsx, and CommentsSection.jsx | Show guest-only prompt at each review entry point. | Do not hide public comment reading or change authorization/backend behavior. |
| frontend/src/components/comments/GuestCommentPrompt.jsx and test | Provide and test the login link with current route state. | Keep route state compatible with Login.jsx location.state.from.pathname. |

## Dependencies

None. Keep authenticated review and edit controls unchanged.

## Testing

- Unit: Focused ExperienceDetails/frontend component tests, if a route-level test harness exists.
- Integration: Run frontend Cypress component tests for AddCommentForm.test.jsx and CommentCard.test.jsx, and relevant Vitest suite.
- Manual/UX: Open an experience logged out, confirm only the small link appears, follow it to sign-in, and return to the same experience; inspect CommentsModal public reading.
- Regression coverage: Confirm authenticated visitors still see the existing composer and public comments remain visible to guests.

## Definition of Done

- [x] Story acceptance criteria covered with recorded results.
- [x] Targeted checks pass; existing intended behavior is preserved.
- [x] Documentation updated; no unresolved contract conflicts.

## Documentation updates

Update this Task with completion status and test evidence; no separate user-facing docs change is expected.

## Progress and completion evidence

Implemented a small “Log in to comment” link in place of ExperienceDetails review composition for logged-out visitors. It passes the current React Router location as Login route state; Login.jsx returns to `from.pathname`. CommentsSection and CommentsModal also show the guest-only login link while preserving public comment reading; modal comment cards remain read-only. Focused Vitest for GuestCommentPrompt, CommentsSection, and CommentsModal passed 3/3 tests; GuestCommentPrompt verifies pathname, query, and hash route state. Authenticated composer behavior remains selected by userDetails in ExperienceDetails, and the modal link is controlled by isLoggedIn.

## Git history

Link implementation commits only when their commit message contains an exact
`Work-Item: EPIC-comment-photo-editing/STORY-001/TASK-001` trailer. The dashboard derives this section from Git history;
do not hand-maintain or infer commit links.

<!-- children:start -->
<!-- children:end -->
