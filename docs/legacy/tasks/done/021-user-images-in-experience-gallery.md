# 021 — User Images in Experience Gallery

**Estimated Difficulty:** 5

## Overview

Display user-uploaded review images in the experience image gallery alongside organizer-uploaded images. When viewing a user-uploaded image in the gallery, display the corresponding review beside the image (to the left in desktop layout), reusing components as much as possible. Modify the `ImageGalleryModal` only if best practices call for it.

**Depends on:** Task 019 (Refactor ImageGalleryModal), Task 020 (Multiple Images in Reviews).

## Requirements

### Functional Requirements

1. The experience image gallery (`ImageGalleryModal` on `ExperienceDetails`) includes user-uploaded images from reviews in addition to organizer-uploaded images.
2. Images are separated into two sections in the gallery:
   - **Organizer images**: the experience's `images` array (existing behavior).
   - **Guest photos**: images extracted from the experience's reviews (`Comment.images`).
3. In the thumbnail grid, guest photos are labeled with a section header: *"Guest Photos"*.
4. In the lightbox view, when viewing a guest photo:
   - The review content is displayed alongside the image (to the left on desktop, above on mobile).
   - The review display includes: reviewer name (or "Anonymous"), star rating, title, and body text.
   - Reuse the `CommentCard` component or a simplified variant for the review display.
5. When viewing an organizer image, no review context is shown (just the image, as currently).
6. The combined gallery maintains the same navigation (keyboard arrows, click navigation).

### Non-Functional Requirements

- Guest photos are fetched alongside experience comments — no additional API call if comments are already loaded.
- The `ImageGalleryModal` component interface is extended minimally. Prefer composition over modification.
- The layout shift between "image-only" and "image + review" views should be smooth.

## Current State

- **`ExperienceDetails.jsx`**: Uses `ImageGalleryModal` (task 019) with `experience.images` (organizer-uploaded only).
- **`ImageGalleryModal`**: Accepts `images: [{ imageUrl, accessibleText? }]`. Renders thumbnail grid and lightbox. No concept of "attached metadata" per image.
- **Comment model**: Has `images` JSON field (task 020): `[{ imageUrl, accessibleText? }]`.
- **Comments are fetched** per experience via `GET /api/experiences/:code/comments`. Images are included in comment responses.

## Implementation Steps

### Backend Changes

#### 1. (Optional) Add Endpoint for Experience Review Images
- If the existing comments endpoint doesn't efficiently return all review images for an experience, add:
  `GET /api/experiences/:code/review-images`.
- Returns a flat list of images with their associated review context:
  ```json
  [
    {
      "imageUrl": "...",
      "accessibleText": "...",
      "review": {
        "id": 42,
        "title": "Amazing!",
        "comment": "Great experience...",
        "stars": 5,
        "userName": "John D.",
        "anonymity": 2,
        "createdAt": "2026-04-10"
      }
    }
  ]
  ```
- This avoids iterating through all comments on the frontend to extract images.
- Paginate if there are many review images (e.g., max 50 per request).

#### 2. Update Comment Query Includes
- Ensure the existing comments endpoint includes the `images` field in each comment response (should already be the case from task 020).

### Frontend Changes

#### 3. Compose Combined Image List in `ExperienceDetails`
- After loading experience data and comments, build a combined image list:
  ```javascript
  const organizerImages = experience.images.map(img => ({
    ...img,
    source: 'organizer',
    review: null
  }));
  
  const guestImages = comments
    .filter(c => c.images?.length > 0)
    .flatMap(c => c.images.map(img => ({
      ...img,
      source: 'guest',
      review: { id: c.id, title: c.title, comment: c.comment, stars: c.stars, userName: c.userName, anonymity: c.anonymity }
    })));
  
  const allGalleryImages = [...organizerImages, ...guestImages];
  ```
- Pass `allGalleryImages` to `ImageGalleryModal`.

#### 4. Extend `ImageGalleryModal` Interface (Minimal)
- Add an optional `renderSidebar(imageData)` prop to `ImageGalleryModal`.
- When `renderSidebar` is provided and returns content, the lightbox layout shifts:
  - Desktop: sidebar (left, ~40% width) + image (right, ~60%).
  - Mobile: sidebar (top) + image (bottom).
- When `renderSidebar` returns `null`, the layout is image-only (existing behavior).
- This keeps `ImageGalleryModal` generic — it doesn't know about reviews.

#### 5. Create `ReviewSidebar` Component
- File: `frontend/src/routes/experience-details/components/ReviewSidebar.jsx`.
- Props: `review` (review data object).
- Renders: reviewer name/anonymous indicator, star rating, title, body text.
- Styled to fit within the lightbox sidebar area.
- Reuse `CommentCard` styling or create a lightweight variant.

#### 6. Wire `renderSidebar` in `ExperienceDetails`
- Pass `renderSidebar` to `ImageGalleryModal`:
  ```jsx
  <ImageGalleryModal
    images={allGalleryImages}
    isOpen={isGalleryOpen}
    onClose={() => setIsGalleryOpen(false)}
    renderSidebar={(imageData) =>
      imageData.source === 'guest' && imageData.review
        ? <ReviewSidebar review={imageData.review} />
        : null
    }
  />
  ```

#### 7. Update `ImageThumbnailGrid` — Section Headers
- If the images array contains both `source: 'organizer'` and `source: 'guest'` items, render section headers in the thumbnail grid:
  - *"Experience Photos"* above organizer images.
  - *"Guest Photos"* above guest images.
- This can be done by grouping images by `source` in the grid renderer.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create (optional) | `backend/server/controllers/Experience.controller.js` (add review-images endpoint) |
| Modify | `frontend/src/routes/experience-details/ExperienceDetails.jsx` |
| Modify | `frontend/src/components/image-gallery-modal/ImageGalleryModal.jsx` (add `renderSidebar` prop) |
| Modify | `frontend/src/components/image-gallery-modal/LightboxOverlay.jsx` (layout for sidebar) |
| Modify | `frontend/src/components/image-gallery-modal/ImageThumbnailGrid.jsx` (section headers) |
| Create | `frontend/src/routes/experience-details/components/ReviewSidebar.jsx` |

## Definition of Done

- [x] Experience gallery shows both organizer images and user-uploaded review images.
- [x] Thumbnail grid has section headers separating organizer and guest photos.
- [x] Lightbox displays review context (name, stars, title, body) alongside guest photos.
- [x] Lightbox displays image-only for organizer photos.
- [x] Navigation (keyboard + click) works across both organizer and guest images.
- [x] `ImageGalleryModal` is extended minimally via the `renderSidebar` pattern (no review-specific logic in the component itself).
- [x] Responsive layout: sidebar left on desktop, above on mobile.
- [x] No regression in the organizer-image-only gallery behavior.
- [x] All existing tests pass; new tests cover the combined gallery.
- [x] Technical documentation updated.

## Testing

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `ExperienceDetails.test.jsx` | Combined image list includes both organizer and guest images; guest images have review metadata; `renderSidebar` returns ReviewSidebar for guest images; returns null for organizer images |
| `ImageGalleryModal.test.jsx` | Calls `renderSidebar` with image data on each lightbox view; renders sidebar content when provided; renders image-only when renderSidebar returns null |
| `ImageThumbnailGrid.test.jsx` | Renders section headers when images have mixed sources; no headers when all images are same source |
| `LightboxOverlay.test.jsx` | Renders sidebar alongside image when sidebar content provided; uses full-width when no sidebar; responsive class switching for mobile |
| `ReviewSidebar.test.jsx` | Renders reviewer name; renders star rating; renders review title and body; handles anonymous reviews |

### Unit Tests — Backend (if endpoint added)

| Test File | Test Cases |
|-----------|------------|
| `tests/unit/experience-controller.test.js` | Review-images endpoint returns images with review context; paginates results; returns empty array for experiences with no review images |

### Integration Tests

- Load experience with reviews that have images → verify combined gallery shows all images.
- Navigate to a guest photo in lightbox → verify review sidebar appears.
- Navigate to an organizer photo → verify no sidebar.

### Manual Verification

1. View an experience with organizer images and reviews with images → verify both appear in gallery.
2. Click a guest photo thumbnail → verify lightbox shows review sidebar.
3. Navigate from guest photo to organizer photo → verify sidebar disappears.
4. On mobile → verify review content stacks above the image.
5. Experience with no review images → verify gallery shows organizer images only (no "Guest Photos" section).

## Implementation Notes

- Added `experienceGalleryImages.js` to compose organizer-first gallery data from organizer images or thumbnail fallback plus review images already present on experience comments.
- Extended `ImageGalleryModal` with an optional `renderSidebar(imageData)` prop so review context stays injected from `ExperienceDetails` via `ReviewSidebar` instead of introducing review-specific logic into the shared gallery component.
- Kept the hero image mosaic organizer-first while allowing the shared lightbox and gallery modal to navigate across organizer and guest photos in one combined list.

## Validation

- Frontend: `npm run test:unit -- --run`

## Documentation Updates

- **Frontend component docs**: Document the `renderSidebar` prop on `ImageGalleryModal`, the `ReviewSidebar` component, and the combined image list pattern.
- **`backend/docs/`**: Document the `/api/experiences/:code/review-images` endpoint (if created).
- **`docs/architecture-diagrams.md`**: Note the image gallery composition pattern.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.
