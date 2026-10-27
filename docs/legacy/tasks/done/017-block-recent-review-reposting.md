# 017 — Block Recent Review Re-Posting (2-Week Cooldown Notice)

**Estimated Difficulty:** 3
**Status:** COMPLETED
**Completed:** 2026-04-12

## Implementation Notes

- Added `reviewEligibility` state to ExperienceDetails.jsx, initialized as `{ eligible: true, recentReview: null }`.
- On mount (when experienceData.id and userDetails are available), calls `GET /api/comments/eligibility` endpoint.
- If not eligible, shows blue info banner + recent review with edit/delete via FullCommentCard.
- Deleting the review resets eligibility to true and re-shows the form.
- Seamlessly integrates with task 016: post → thank-you, then on reload → recently-posted notice.
- Backend eligibility endpoint implemented in task 015 (getReviewEligibility service + controller + route).

## Overview

If a user has posted a review for an experience in the past two weeks, do not show the "Post Comment" form on the `ExperienceDetails` page. Instead, display a notice: *"You have already recently posted a review for this experience."* Show the user's existing review below the notice with edit and delete buttons.

This task works in conjunction with tasks 015 (backend rate limit) and 016 (post-review UX).

## Requirements

### Functional Requirements

1. On loading `ExperienceDetails`, check whether the authenticated user has a top-level review for this experience within the past 14 days.
2. If yes:
   - Do not render `AddCommentForm`.
   - Display a notice: *"You have already recently posted a review for this experience."* (styled as an info banner).
   - Display the user's recent review as a `CommentCard` with edit and delete buttons.
3. If no (or user is not authenticated):
   - Display `AddCommentForm` as normal.
4. After deleting the review (via the delete button), the notice is removed and the form reappears (subject to the 14-day cooldown — if deletion resets eligibility, the form should show).
5. After editing the review, the updated review remains displayed in place of the form.

### Non-Functional Requirements

- The eligibility check should be a single API call on page load (not a separate per-component request).
- The review data can be included in the existing experience details response or fetched via the eligibility endpoint (task 015).

## Current State

- **`ExperienceDetails.jsx`**: Always renders `AddCommentForm` for authenticated users.
- **`Comment.service.js`**: No eligibility check endpoint (task 015 optionally adds one).
- **Backend**: No endpoint to check if the user has recently reviewed a specific experience.
- **Frontend**: No conditional rendering based on review history.

## Implementation Steps

### Backend Changes

#### 1. Ensure Eligibility Endpoint Exists
- If not already created by task 015, add: `GET /api/comments/eligibility?commentableType=Experience&commentableId=:id`.
- Returns:
  ```json
  {
    "eligible": false,
    "nextEligibleDate": "2026-05-01",
    "recentReview": {
      "id": 42,
      "title": "Great experience",
      "comment": "...",
      "stars": 5,
      "createdAt": "2026-04-17T10:00:00Z"
    }
  }
  ```
- If no recent review: `{ "eligible": true, "recentReview": null }`.
- Requires authentication.
- For unauthenticated users, always return `{ "eligible": true }`.

#### 2. Add `getRecentUserReview()` to `Comment.service.js`
- Query the user's most recent top-level review for the given bookable within 14 days.
- Return the review object if found, `null` otherwise.

### Frontend Changes

#### 3. Fetch Eligibility on `ExperienceDetails` Load
- On component mount (for authenticated users), call the eligibility endpoint.
- Store the result in component state: `{ eligible, recentReview }`.

#### 4. Conditional Rendering
- If `eligible === false` and `recentReview` exists:
  - Render info banner: *"You have already recently posted a review for this experience."* (Tailwind: `bg-blue-50 border-blue-400 text-blue-800 p-4 rounded`).
  - Render the `recentReview` as a `CommentCard` with `showActions={true}`.
- If `eligible === true`:
  - Render `AddCommentForm` (default behavior).
- If user is not authenticated:
  - Render `AddCommentForm` (which already handles the unauthenticated state, or prompt to log in).

#### 5. Handle Delete → Reset Eligibility
- After successfully deleting the recent review, reset `eligible = true` and `recentReview = null`.
- The form reappears.

#### 6. Integrate with Task 016 (Post-Review UX)
- When `AddCommentForm`'s `onReviewPosted` callback fires (task 016), transition to the "recently posted" state: set `eligible = false`, `recentReview = postedReview`.
- This creates a seamless flow: post → thank-you → (on reload) → already-posted notice.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `backend/server/services/Comment.service.js` |
| Modify (if not done by task 015) | `backend/server/controllers/Comment.controller.js` |
| Modify (if not done by task 015) | `backend/server/routes/comments.js` |
| Modify | `frontend/src/routes/experience-details/ExperienceDetails.jsx` (or CommentsModal.jsx) |

## Definition of Done

- [ ] Eligibility endpoint returns whether the user can post and their recent review if any.
- [ ] `ExperienceDetails` hides the post form when the user has a recent review.
- [ ] Info notice displays when the form is hidden.
- [ ] The user's recent review displays with edit and delete buttons.
- [ ] Deleting the review re-shows the form.
- [ ] Integrates seamlessly with the post-review thank-you flow (task 016).
- [ ] Unauthenticated users see the form (or a login prompt).
- [ ] All existing tests pass; new tests cover eligibility checking.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/comment-service.test.js` | `getRecentUserReview()` returns review when one exists within 14 days; returns null when review is older than 14 days; returns null when no review exists; only considers top-level reviews (ParentId = null) |
| `tests/unit/comment-controller.test.js` | Eligibility endpoint returns `eligible: false` with recentReview for cooled-down user; returns `eligible: true` for eligible user; requires authentication |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `ExperienceDetails.test.jsx` | Shows AddCommentForm when eligible; shows info notice when not eligible; shows recent review with actions when not eligible; re-shows form after deleting review; transitions from thank-you to already-posted on re-render |

### Integration Tests

- Post a review → reload page → verify form hidden, notice shown, review displayed.
- Delete view → reload → verify form shown.
- Post as user A → view page as user B → verify user B sees their own form.

### Manual Verification

1. Post a review → refresh page → verify notice replaces form.
2. Edit the review from the notice area → save → verify update.
3. Delete the review → verify form reappears.
4. Log in as a different user → verify that user sees their own form.

## Documentation Updates

- **`backend/docs/`**: Document the `/api/comments/eligibility` endpoint.
- **Frontend component docs**: Document the eligibility integration in `ExperienceDetails`.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
