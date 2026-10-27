# 016 — Hide Comment Section After Posting (Show Thank-You + Edit/Delete)

**Estimated Difficulty:** 3
**Status:** COMPLETED
**Completed:** 2026-04-12

## Implementation Notes

- Added `justPostedReview` state to ExperienceDetails.jsx.
- When AddCommentForm's onSuccess fires, the review data is stored in state, hiding the form.
- Thank-you banner (green) is shown with the posted review rendered via FullCommentCard (lazy-loaded from components/comments/CommentCard.jsx).
- FullCommentCard provides edit/delete buttons — delete resets state so form reappears.
- Imported FullCommentCard as a lazy component to avoid name collision with the local preview CommentCard.
- Added renderStarsHelper and formatCommentDateHelper functions for FullCommentCard props.
- Implemented jointly with task 017 since they share the same conditional rendering logic.

## Overview

After a user posts a review in the `ExperienceDetails` page, **hide the "Post Comment" form** and replace it with a thank-you notice: *"Thank you for your review!"*. Below the notice, display the user's newly posted review with **edit** and **delete** buttons.

## Requirements

### Functional Requirements

1. Immediately after a successful `POST /api/comments/:type/:id`, the `AddCommentForm` is replaced with:
   - A notice: *"Thank you for your review!"* (styled as a success banner).
   - The posted review rendered as a `CommentCard` with edit and delete action buttons.
2. The edit button opens the review in edit mode (inline editing — title, stars, body, anonymity editable).
3. The delete button shows a confirmation dialog, then calls `DELETE /api/comments/:id`.
4. After deletion, the form reappears (user can post again, subject to the 14-day cooldown from task 015).
5. After editing, the updated review remains displayed in place of the form.
6. This behavior persists only for the current session/page load. On page refresh, the standard form/comment display logic applies.

### Non-Functional Requirements

- No additional API calls required — the posted review data is already available from the POST response.
- The transition from form to thank-you is animated (fade-out form, fade-in notice).
- Edit mode reuses the `AddCommentForm` fields (or a dedicated inline edit variant).

## Current State

- **`ExperienceDetails.jsx`**: Renders `AddCommentForm` and `CommentsSection` (via `CommentsModal`). After posting, the form remains visible and the new comment appears in the list.
- **`AddCommentForm.jsx`**: Form with title, comment body, stars rating, anonymity toggle, submit button. On successful POST, the comment is added to the parent component's state but the form is not hidden.
- **`CommentCard.jsx`**: Renders a single comment with user info, stars, title, body. No edit/delete buttons currently.
- **`Comment.controller.js`**: `postComment()` returns the created comment; `updateComment()` handles PATCH; `deleteComment()` handles DELETE. Both update/delete check user authorization.

## Implementation Steps

### Frontend Changes

#### 1. Add State to Track Posted Review
- In the parent component (e.g., `ExperienceDetails.jsx` or `CommentsSection.jsx`), add state:
  - `justPostedReview`: stores the review object after a successful post (or `null`).

#### 2. Conditional Rendering in Comment Area
- If `justPostedReview` is not null:
  - Hide `AddCommentForm`.
  - Show the thank-you notice banner (Tailwind: `bg-green-50 border-green-400 text-green-800 p-4 rounded`).
  - Render the posted review as a `CommentCard` with `showActions={true}`.
- If `justPostedReview` is null:
  - Show `AddCommentForm` (default behavior).

#### 3. Update `AddCommentForm` — Post Callback
- After successful POST, call a callback prop `onReviewPosted(reviewData)` that sets `justPostedReview` in the parent.
- Clear the form fields.

#### 4. Add Edit/Delete Buttons to `CommentCard`
- Accept a prop `showActions` (default `false`).
- When `true`, render "Edit" and "Delete" buttons.
- "Edit" sets the card into inline edit mode (show editable fields for title, body, stars, anonymity).
- "Delete" shows a confirmation dialog (reuse `window.confirm` or a lightweight modal).

#### 5. Implement Inline Edit Mode in `CommentCard`
- When in edit mode, render editable inputs for title, body, stars selector, anonymity toggle.
- "Save" button calls `PATCH /api/comments/:id` and updates the displayed review.
- "Cancel" button exits edit mode without changes.

#### 6. Implement Delete Action
- On confirm, call `DELETE /api/comments/:id`.
- On success, set `justPostedReview = null` → form reappears.
- Update the comment count in the parent.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `frontend/src/routes/experience-details/ExperienceDetails.jsx` (or CommentsModal.jsx) |
| Modify | `frontend/src/components/comments/AddCommentForm.jsx` |
| Modify | `frontend/src/components/comments/CommentCard.jsx` |

## Definition of Done

- [ ] After posting a review, the form is hidden and replaced with a thank-you notice.
- [ ] The posted review is displayed below the notice with edit and delete buttons.
- [ ] Edit opens inline editing; save updates the review via PATCH.
- [ ] Delete removes the review via DELETE; form reappears after deletion.
- [ ] Transition is visually smooth (fade-out/fade-in).
- [ ] On page refresh, the standard flow applies (form shown if eligible, per task 017).
- [ ] All existing tests pass; new tests cover the post-review UX flow.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `AddCommentForm.test.jsx` | Calls `onReviewPosted` callback after successful POST; clears form fields after successful POST |
| `CommentCard.test.jsx` | Renders edit/delete buttons when `showActions=true`; hides buttons when `showActions=false`; edit mode shows editable fields; save calls PATCH API; cancel exits edit mode; delete shows confirmation; confirmed delete calls DELETE API |
| `ExperienceDetails.test.jsx` (or CommentsSection) | Shows AddCommentForm by default; hides form and shows thank-you after posting; shows posted review with actions; form reappears after deleting the review |

### Integration Tests

- Post a review → verify form hidden, thank-you shown, review with edit/delete displayed.
- Edit the review → verify updated content displayed.
- Delete the review → verify form reappears.

### Manual Verification

1. Post a review on an experience → verify form disappears, "Thank you!" notice appears.
2. See the posted review below with edit/delete buttons.
3. Click "Edit" → modify text → save → verify update.
4. Click "Delete" → confirm → verify form reappears.

## Documentation Updates

- **Frontend component docs**: Document the `onReviewPosted` callback prop on `AddCommentForm` and the `showActions` prop on `CommentCard`.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
