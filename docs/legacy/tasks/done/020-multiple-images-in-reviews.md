# 020 — Multiple Images in Reviews

**Status:** COMPLETED
**Estimated Difficulty:** 8

## Overview

Add the capability for users to **attach and display multiple images** in experience reviews. The first three images are shown as thumbnails alongside the review. If there are more than three images, the third thumbnail displays a **"+X"** overlay indicating the count of additional images. Clicking the thumbnails opens the review's images in the `ImageGalleryModal` (from task 019).

**Depends on:** Task 019 (Refactor ImageGalleryModal) — provides the reusable gallery component.

## Requirements

### Functional Requirements

1. Users can attach up to **10 images** when posting a review.
2. Images are uploaded to Cloudflare R2 via the existing `POST /api/media/upload` endpoint with a new `mediaKind: 'review-image'`.
3. The `Comment` model stores image references in a JSON field: `images` (array of `{ imageUrl, accessibleText? }`).
4. **Display in `CommentCard`**:
   - Show the first 3 images as small thumbnails (e.g., 64×64px or 80×80px).
   - If there are more than 3 images, the 3rd thumbnail has a semi-transparent overlay displaying "+X" where X = `images.length - 3`.
   - Clicking any thumbnail opens `ImageGalleryModal` starting at that image's index.
5. **In `AddCommentForm`**:
   - Add an image upload section: "Attach Photos" button.
   - Show selected images as a preview grid with remove (X) buttons.
   - Max 10 images.
   - Accepted formats: JPEG, PNG, WebP, GIF (consistent with `Media.controller.js` validation).
   - Max file size per image: 5MB.
6. Images are uploaded during form submission (not on select), alongside the comment POST.

### Non-Functional Requirements

- Image upload is atomic with the comment creation: if the comment POST fails, images should not be orphaned (or at least handle cleanup).
- Thumbnail rendering uses `object-fit: cover` for consistent sizing.
- Image loading is lazy (only load when in viewport).
- The `+X` indicator is positioned absolutely on the 3rd thumbnail with a semi-transparent black overlay.

## Current State

- **Comment model**: Has `id`, `title`, `comment`, `stars`, `UserId`, `CommentableId`, `CommentableType`, etc. **No `images` field**.
- **`Media.controller.js`**: Supports `mediaKind` values: `'profile'`, `'asset'`, `'experience-thumbnail'`, `'experience-gallery'`. No `'review-image'` kind.
- **`AddCommentForm.jsx`**: Text fields for title, body, stars, anonymity. No image upload UI.
- **`CommentCard.jsx`**: Renders title, body, stars, user info. No image display.
- **`ImageGalleryModal`**: Created in task 019 — accepts `images` array and provides gallery + lightbox.
- **R2 storage**: Supports image uploads via workers with signed URLs and content-type validation.

## Implementation Steps

### Backend Changes

#### 1. Migration: Add `images` Column to Comment Model
- Create migration `add-images-to-comments.js`.
- Add `images` column: `JSON` (or `TEXT` with JSON serialization), default `[]`.
- The field stores an array of objects: `[{ imageUrl: string, accessibleText?: string }]`.

#### 2. Update Comment Model
- Add `images` field definition with type `JSON`, default `[]`.
- Add validation: max 10 items in the array.

#### 3. Update `Media.controller.js` — Add `review-image` Kind
- Add `'review-image'` to the allowed `mediaKind` enum.
- Storage prefix: `reviews/` (e.g., `reviews/{commentId}/{filename}`).
- Since the comment may not exist yet at upload time, use a temporary prefix like `reviews/pending/{userId}/{filename}` and rename on comment creation.
- Alternatively, upload images as part of the comment creation flow (multipart form or sequential upload → comment POST).

#### 4. Update `Comment.service.js` — `postComment()` and `updateComment()`
- Accept `images` array in the input.
- Validate: each item has `imageUrl`, max 10 items.
- Store in the `images` JSON field.

#### 5. Update `Comment.controller.js`
- Accept `images` in the POST/PATCH body.
- Validate image URLs are valid R2 URLs (same-origin check via `resolveMediaUrl` patterns).

#### 6. Ensure Images are Returned in Comment Queries
- `getCommentsBySource()`, `getRepliesByParent()`, and experience detail comment fetches should include the `images` field in their response.

### Frontend Changes

#### 7. Add Image Upload to `AddCommentForm`
- Add an "Attach Photos" button that opens a file picker (accept=`image/jpeg,image/png,image/webp,image/gif`).
- On file selection, add to a local `selectedImages` state (File objects + preview URLs via `URL.createObjectURL`).
- Show preview grid with thumbnails and remove (X) buttons.
- Max 10 images; show count: *"3 / 10 photos attached"*.
- Max 5MB per file — validate on selection, show error for oversized files.
- On form submit:
  1. Upload each image via `POST /api/media/upload?ownerType=user&ownerId={userId}&kind=review-image`.
  2. Collect the returned URLs.
  3. Include `images: [{ imageUrl: url }]` in the comment POST body.

#### 8. Update `CommentCard` — Display Review Images
- After the review body text, render a thumbnail row:
  - Show first 3 images as thumbnails (`w-16 h-16` or `w-20 h-20`, `object-cover`, `rounded`).
  - If `images.length > 3`: 3rd thumbnail has an absolute-positioned overlay:
    ```jsx
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold rounded">
      +{images.length - 3}
    </div>
    ```
  - Clicking any thumbnail opens `<ImageGalleryModal images={images} initialIndex={clickedIndex} />`.

#### 9. Image Gallery Integration
- `CommentCard` internally manages `isGalleryOpen` state.
- Passes `images` from the comment's `images` field to `ImageGalleryModal`.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `backend/server/migrations/XXXXXX-add-images-to-comments.js` |
| Modify | `backend/server/models/Comment.js` |
| Modify | `backend/server/controllers/Media.controller.js` |
| Modify | `backend/server/services/Comment.service.js` |
| Modify | `backend/server/controllers/Comment.controller.js` |
| Modify | `frontend/src/components/comments/AddCommentForm.jsx` |
| Modify | `frontend/src/components/comments/CommentCard.jsx` |

## Definition of Done

- [x] Users can attach up to 10 images when posting a review.
- [x] Images are uploaded to R2 with `mediaKind: 'review-image'`.
- [x] Comment model stores images as a JSON array.
- [x] `CommentCard` displays first 3 thumbnails with "+X" on the 3rd if more exist.
- [x] Clicking thumbnails opens `ImageGalleryModal` at the correct index.
- [x] `AddCommentForm` has image upload UI with previews, remove, and file validation.
- [x] Image URLs are validated server-side.
- [x] Max 10 images, max 5MB per file enforced.
- [x] All existing tests pass; new tests cover image upload and display.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Backend

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/comment-service.test.js` | `postComment()` stores images array; validates max 10 images; accepts empty images array; `updateComment()` updates images array |
| `tests/unit/comment-model.test.js` | Model validates images array length (≤ 10); default is empty array |
| `tests/unit/media-controller.test.js` | Accepts `mediaKind: 'review-image'`; stores in `reviews/` prefix |

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `AddCommentForm.test.jsx` | Renders "Attach Photos" button; file picker opens on click; shows preview grid; remove button removes image; validates max 10 images; validates file size ≤ 5MB; uploads images on form submit; includes images in comment payload |
| `CommentCard.test.jsx` | Renders 0 thumbnails when no images; renders 3 thumbnails for 3 images; renders 3 thumbnails with "+2" overlay for 5 images; clicking thumbnail opens ImageGalleryModal at correct index; does not render thumbnail row when images is empty |

### Integration Tests

- Post review with 3 images → verify images stored in DB → verify thumbnails render.
- Post review with 5 images → verify "+2" overlay on 3rd thumbnail.
- Click thumbnail → verify gallery opens with all 5 images.

### Manual Verification

1. Post a review with 5 images → verify upload succeeds.
2. View the review → verify 3 thumbnails with "+2" on the 3rd.
3. Click a thumbnail → verify gallery opens with all 5 images navigable.
4. Post a review with no images → verify no thumbnail row rendered.
5. Try uploading 11 images → verify error.

## Documentation Updates

- **`backend/docs/`**: Document the `review-image` media kind, the `images` field on Comment, and the max limits.
- **Frontend component docs**: Document the image upload props on `AddCommentForm` and the image display on `CommentCard`.
- **`docs/architecture-diagrams.md`**: Update the Data Model ERD to show the `images` field on Comment.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Implementation Notes

### Deviations from Plan

1. The existing `Comment` model file is `Comment.model.js` (not `Comment.js`), and was updated directly.
2. Review image entries are stored as normalized media object keys in the DB and returned as resolved public URLs in API responses.
3. Existing experience comment query paths were updated in `Experience.controller.js` to include and resolve `images` for display.

### Files Created

- `backend/server/migrations/20260416120000-add-images-to-comments.js`
- `frontend/src/components/comments/AddCommentForm.test.jsx`
- `frontend/src/components/comments/CommentCard.test.jsx`

### Files Modified

- `backend/server/models/Comment.model.js`
- `backend/server/controllers/Media.controller.js`
- `backend/server/services/Comment.service.js`
- `backend/server/controllers/Comment.controller.js`
- `backend/server/controllers/Experience.controller.js`
- `backend/tests/unit/comment-service.test.js`
- `frontend/src/components/comments/AddCommentForm.jsx`
- `frontend/src/components/comments/CommentCard.jsx`
- `frontend/src/components/comments/CommentPreview.jsx`
- `frontend/src/routes/experience-details/ExperienceDetails.jsx`

### Test Results

- Backend: 238 tests across 21 suites, all passing.
- Frontend: 177 tests across 14 files, all passing.
