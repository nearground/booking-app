# 015 — Rate-Limit Review Posting (Max One Per Two Weeks)

**Estimated Difficulty:** 3
**Status:** COMPLETED
**Completed:** 2026-04-12

## Implementation Notes

- Added `REVIEW_COOLDOWN_MS` constant (14 days) to `constants.js`.
- Added cooldown check in `postComment()` — queries for recent top-level review by same user for same bookable within 14 days.
- Returns 429 with next eligible date when cooldown is active. Replies are exempt.
- Added `getReviewEligibility()` to Comment.service.js and exposed via `GET /api/comments/eligibility` (authenticated).
- Added composite index migration on `(UserId, CommentableType, CommentableId, createdAt)`.  
- Frontend AddCommentForm handles 429 responses with inline error display.
- Imported `Op` from sequelize for date comparison.
- 14 unit tests covering title validation + cooldown + eligibility.

## Overview

Limit posting experience reviews to a maximum of **one review every two weeks** for the same bookable (CommentableType + CommentableId) and user combination. If a user attempts to post a second review for the same experience within two weeks, the request is rejected with a clear error message.

## Requirements

### Functional Requirements

1. A user can post at most one review per `CommentableType` + `CommentableId` combination every 14 days.
2. The check applies to top-level comments only (not replies — `ParentId !== null` are exempt).
3. If the user attempts to post while within the cooldown window, the API returns a 429 or 400 status with: *"You have already posted a review for this experience in the past two weeks. Please wait until [date] to post again."*
4. The cooldown is calculated from the `createdAt` timestamp of the user's most recent review for that bookable.
5. The restriction applies to all `CommentableType` values (Experience, Hotel, Organizer).

### Non-Functional Requirements

- The check is performed at the service level (before database write), not just at the rate limiter middleware level.
- The query is indexed: `(UserId, CommentableType, CommentableId, createdAt)`.
- The cooldown period (14 days) should be configurable via a constant.

## Current State

- **`Comment.service.js`**: `postComment()` validates CommentableType, stars (1-5), comment length (10-1000), anonymity level. No time-based posting restriction exists.
- **`Comment.controller.js`**: `postComment()` calls the service. No rate limiting on review posting beyond generic middleware.
- **Comment model**: Has `UserId`, `CommentableId`, `CommentableType`, `createdAt`. No index on the combination.
- **`auth-rate-limit.js`**: Has `createLoginRateLimiter()` and `createRegisterRateLimiter()`. No comment-specific rate limiter.

## Implementation Steps

### Backend Changes

#### 1. Add Cooldown Check to `Comment.service.js` — `postComment()`
- Before creating the comment, query:
  ```javascript
  const recentReview = await Comment.findOne({
    where: {
      UserId: userId,
      CommentableType: commentableType,
      CommentableId: commentableId,
      ParentId: null, // top-level only
      createdAt: { [Op.gte]: new Date(Date.now() - REVIEW_COOLDOWN_MS) }
    },
    order: [['createdAt', 'DESC']]
  });
  ```
- If `recentReview` exists, throw an error with the next eligible date.
- Define `REVIEW_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000` in `backend/server/utils/constants.js`.

#### 2. Add Database Index (Migration)
- Create migration `add-comment-user-bookable-index.js`.
- Add composite index: `(UserId, CommentableType, CommentableId, createdAt)` for efficient cooldown queries.

#### 3. Update `Comment.controller.js` — Error Response
- Catch the cooldown error from the service and return a 429 response with:
  ```json
  {
    "status": 429,
    "errors": ["You have already posted a review for this experience in the past two weeks. Please wait until 2026-05-01 to post again."]
  }
  ```

#### 4. Add `getNextEligibleReviewDate()` Helper
- Utility function: given a recent review's `createdAt`, returns `createdAt + 14 days`.
- Used by both the backend error message and a potential frontend check endpoint.

#### 5. (Optional) Add Eligibility Check Endpoint
- `GET /api/comments/eligibility?commentableType=Experience&commentableId=123`.
- Returns `{ eligible: boolean, nextEligibleDate?: string }`.
- Useful for the frontend to proactively hide/show the review form (see tasks 016, 017).

### Frontend Changes

#### 6. Handle 429 Response in `AddCommentForm`
- When the API returns 429, display the error message as a toast or inline error.
- Optionally disable the submit button and show the next eligible date.

## Files to Create or Modify

| Action | File |
|--------|------|
| Modify | `backend/server/services/Comment.service.js` |
| Modify | `backend/server/controllers/Comment.controller.js` |
| Create | `backend/server/migrations/XXXXXX-add-comment-user-bookable-index.js` |
| Modify | `backend/server/utils/constants.js` (add `REVIEW_COOLDOWN_MS`) |
| Modify (optional) | `backend/server/routes/comments.js` (eligibility endpoint) |
| Modify | `frontend/src/components/comments/AddCommentForm.jsx` |

## Definition of Done

- [ ] Users cannot post more than one top-level review per bookable per 14 days.
- [ ] Replies (comments with `ParentId`) are exempt from the restriction.
- [ ] API returns 429 with clear error message and next eligible date.
- [ ] Composite index on `(UserId, CommentableType, CommentableId, createdAt)` exists.
- [ ] Cooldown period is configurable via a constant.
- [ ] Frontend handles 429 response gracefully (toast or inline error).
- [ ] All existing tests pass; new tests cover cooldown logic.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/comment-service.test.js` | `postComment()` creates review when no recent review exists; rejects with cooldown error when recent review within 14 days; allows posting for a different CommentableId; allows posting for a different CommentableType; allows replies (ParentId not null) regardless of cooldown; returns correct next eligible date |
| `tests/unit/comment-controller.test.js` | Returns 429 with message on cooldown violation; returns 201 on successful post; error message includes next eligible date |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `AddCommentForm.test.jsx` | Displays error message on 429 response; shows next eligible date; disables submit on cooldown |

### Integration Tests

- Post a review → immediately post another for same experience → verify 429.
- Post for experience A → post for experience B → verify both succeed.
- Post a reply → post another reply immediately → verify both succeed.

### Manual Verification

1. Post a review on an experience → attempt to post again → verify error toast.
2. Wait 14 days (or adjust constant for testing) → verify posting allowed.
3. Post a review on a different experience → verify success.

## Documentation Updates

- **`backend/docs/`**: Document the review cooldown policy, the `REVIEW_COOLDOWN_MS` constant, and the optional eligibility endpoint.
- **`docs/architecture-diagrams.md`**: Note the cooldown check in the comment flow.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
