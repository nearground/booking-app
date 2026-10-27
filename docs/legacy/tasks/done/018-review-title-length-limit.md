# 018 — Review Title Length Limit (75 Characters + Word Break)

**Estimated Difficulty:** 2
**Status:** COMPLETED
**Completed:** 2026-04-12

## Implementation Notes

- Backend: Added `len: [0, 75]` field-level validation to Comment model `title` field.
- Backend: Added defense-in-depth validation in `postComment()` and `updateComment()` in Comment.service.js (returns 400).
- Frontend: Added `maxLength={75}` to title input in AddCommentForm.jsx, plus a character counter with color transitions (normal → yellow at 60 → red at 75).
- Frontend: Added Tailwind `break-words` class to title element in CommentCard.jsx.
- Tests: Created `tests/unit/comment-service.test.js` with 6 tests covering both post and update validation.
- No Yup schema was added — the component doesn't use Formik/Yup.

## Overview

Add a 75-character length limit for review titles and apply CSS `word-break` to prevent long titles from overflowing their containers. Enforce the limit on both the backend (validation) and frontend (input maxlength + validation feedback).

## Requirements

### Functional Requirements

1. Review titles are limited to **75 characters** maximum.
2. The `Comment` model validates `title.length <= 75` on create and update.
3. The frontend `AddCommentForm` enforces the limit with:
   - `maxLength={75}` on the title input.
   - A character counter: *"X / 75"* displayed below the input.
   - Inline validation error if the limit is exceeded (if pasting text exceeding the limit).
4. The `CommentCard` component applies CSS `word-break: break-word` (or `overflow-wrap: break-word`) on the title element to prevent layout overflow.

### Non-Functional Requirements

- The minimum title length (if any) is not changed.
- The validation error message is: *"Title must be 75 characters or fewer."*

## Current State

- **Comment model**: Has a `title` field (STRING). No explicit max-length validation on the title column (body has 10–1000 char validation).
- **`AddCommentForm.jsx`**: Has a title input field. No character counter or maxlength attribute.
- **`CommentCard.jsx`**: Renders the title. No explicit `word-break` CSS applied.

## Implementation Steps

### Backend Changes

#### 1. Add Title Length Validation to Comment Model
- Add validation on the `title` field: `len: [0, 75]` (or `[1, 75]` if a minimum is desired).
- The validation should trigger on both create and update.

#### 2. Update `Comment.service.js` — `postComment()` and `updateComment()`
- Add explicit validation before database write (defense in depth):
  ```javascript
  if (title && title.length > 75) {
    throw new Error('Title must be 75 characters or fewer.');
  }
  ```

#### 3. Update `Comment.controller.js`
- Ensure the validation error is returned as a 400 response with the appropriate message.

### Frontend Changes

#### 4. Update `AddCommentForm.jsx` — Title Input
- Add `maxLength={75}` to the title input element.
- Add a character counter below the input: display `{title.length} / 75`.
- Style counter: normal text when under 60 chars, yellow when 60–74, red when 75.
- If pasted text exceeds 75 chars and `maxLength` does not fully prevent it, show inline error.

#### 5. Update `CommentCard.jsx` — Word Break CSS
- Apply `style={{ wordBreak: 'break-word' }}` or Tailwind `break-words` class to the title element.
- Ensure long, unbroken strings (e.g., URLs in titles) wrap properly instead of overflowing.

#### 6. Update Frontend Validation Schema
- If Yup or Formik validation is used for comments, add `.max(75, 'Title must be 75 characters or fewer')` to the title schema.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `backend/server/models/Comment.js` (add title length validation) |
| Modify | `backend/server/services/Comment.service.js` |
| Modify | `backend/server/controllers/Comment.controller.js` |
| Modify | `frontend/src/components/comments/AddCommentForm.jsx` |
| Modify | `frontend/src/components/comments/CommentCard.jsx` |

## Definition of Done

- [ ] Comment model rejects titles longer than 75 characters.
- [ ] Backend returns 400 with clear error message for oversized titles.
- [ ] Title input has `maxLength={75}` and a character counter.
- [ ] Character counter changes color as the limit approaches.
- [ ] `CommentCard` title has `word-break: break-word` CSS.
- [ ] Long, unbroken titles wrap properly in all display contexts.
- [ ] All existing tests pass; new tests cover validation.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/comment-service.test.js` | `postComment()` accepts title of 75 chars; rejects title of 76 chars; accepts empty/null title (if allowed); `updateComment()` rejects title over 75 chars |
| `tests/unit/comment-model.test.js` | Model validation rejects title > 75 chars; accepts title ≤ 75 chars |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `AddCommentForm.test.jsx` | Title input has maxLength={75}; character counter displays correct count; counter turns red at 75; pasting 100-char text is truncated or shows validation error |
| `CommentCard.test.jsx` | Title element has word-break CSS applied; long unbroken title renders without overflow |

### Integration Tests

- Post a review with a 75-char title → verify success.
- Post a review with a 76-char title (direct API call) → verify 400 response.

### Manual Verification

1. In `AddCommentForm`, type a title → verify counter updates.
2. Reach 75 characters → verify counter turns red and input stops accepting.
3. View a review with a long title → verify it wraps properly, no overflow.

## Documentation Updates

- **Backend API docs**: Note the 75-character title limit in the comment creation/update endpoint docs.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
