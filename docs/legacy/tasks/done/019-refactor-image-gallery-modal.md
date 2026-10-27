# 019 — Refactor ImageGalleryModal (Extract from ExperienceDetails)

**Status: COMPLETED**

**Estimated Difficulty:** 5

## Implementation Notes

### Components Created
- `frontend/src/components/image-gallery-modal/ImageGalleryModal.jsx` — Main modal with gallery and lightbox view modes
- `frontend/src/components/image-gallery-modal/LightboxOverlay.jsx` — Full-size image viewer with navigation, keyboard handling, counter
- `frontend/src/components/image-gallery-modal/ImageThumbnailGrid.jsx` — Masonry thumbnail grid with lazy loading

### Design Decisions
1. **ExperienceDetails still uses `LightboxOverlay` directly** for thumbnail-click-to-lightbox (with `growFromThumb` animation origin), while the gallery button uses the full `ImageGalleryModal`. This preserves the origin-based animation from the 2×2 thumbnail grid.
2. **Animations CSS** moved from inline `<style>` in ExperienceDetails into `ImageGalleryModal` (via `galleryAnimationStyles`). `LightboxOverlay` reuses these when rendered inside the modal.
3. **Keyboard handling** is now self-contained in each component: `LightboxOverlay` handles Escape/ArrowLeft/ArrowRight, `ImageGalleryModal` handles Escape in gallery mode.
4. **ARIA roles** added: `role="dialog"`, `aria-modal="true"`, `aria-label` on both modal views.
5. **Lazy loading** added to thumbnail images via `loading="lazy"`.

### Files Modified
- `frontend/src/routes/experience-details/ExperienceDetails.jsx` — Removed ~150 lines of inline lightbox/gallery code, replaced with component imports

### Test Results
- 11 new Vitest tests for ImageGalleryModal, all passing
- All frontend tests pass (168/169, 1 pre-existing failure unrelated to this task)

## Overview

Refactor the image lightbox/gallery logic currently embedded in `ExperienceDetails.jsx` into a standalone, reusable **`ImageGalleryModal`** component. Create additional subcomponents if best practices call for it (e.g., `ImageThumbnailGrid`, `LightboxOverlay`). This extracted component will be reused by tasks 020 (review images) and 021 (user images in experience gallery).

## Requirements

### Functional Requirements

1. **`ImageGalleryModal`** is a self-contained, reusable component that accepts:
   - `images`: array of `{ imageUrl, accessibleText?, caption? }`.
   - `isOpen`: boolean controlling modal visibility.
   - `onClose`: callback to close the modal.
   - `initialIndex`: (optional) which image to start from (default 0).
2. Features preserved from the current ExperienceDetails implementation:
   - Thumbnail grid view (gallery mode).
   - Click-to-expand: clicking a thumbnail opens the lightbox at that image.
   - Full-size lightbox with left/right navigation arrows.
   - Keyboard navigation: Arrow Left/Right to navigate, Escape to close.
   - Smooth animation: `growFromThumb` keyframe animation from thumbnail origin to full-size.
   - Origin-based animation calculated from thumbnail position.
3. Additional subcomponents (if extracted):
   - `ImageThumbnailGrid`: renders the thumbnail grid with click handlers.
   - `LightboxOverlay`: renders the full-size image with navigation, close button, and keyboard handling.
4. The current ExperienceDetails replaces its inline lightbox code with `<ImageGalleryModal />`.

### Non-Functional Requirements

- The component is placed in `frontend/src/components/image-gallery-modal/`.
- Tailwind CSS for styling (consistent with the project).
- Animations use CSS keyframes (consistent with existing `growFromThumb`, `fadeIn`, `zoomIn` animations).
- Accessible: ARIA roles for modal dialog, focus trapping, alt text on images.
- Performance: lazy-load images not currently visible.

## Current State

- **`ExperienceDetails.jsx`**: Contains approximately 100+ lines of inline lightbox logic:
  - State: `selectedImageIndex`, `lightboxOrigin`, `isGalleryOpen`.
  - `growFromThumb` keyframe animation with `lightboxOrigin` (calculated scale/position from thumbnail click).
  - Event handlers: `openLightbox(index, thumbnailElement)`, `closeLightbox()`, `navigateImage(direction)`.
  - Keyboard listener: Arrow Left/Right, Escape.
  - Rendering: backdrop overlay, image container with navigation arrows, thumbnail grid in gallery mode.
- This code is **not reusable** — it's tightly coupled to ExperienceDetails state and rendering.
- **`HotelDetailsViewCard.jsx`**: Uses `react-image-gallery` (third-party library) for hotel images — a different pattern.

## Implementation Steps

### Frontend Changes

#### 1. Create `ImageGalleryModal` Component
- File: `frontend/src/components/image-gallery-modal/ImageGalleryModal.jsx`.
- Props: `images`, `isOpen`, `onClose`, `initialIndex`.
- Internal state: `currentIndex`, `lightboxOrigin`, `viewMode` ('gallery' | 'lightbox').
- Renders either the thumbnail grid (gallery mode) or the lightbox overlay (lightbox mode).

#### 2. Extract `ImageThumbnailGrid` Subcomponent
- File: `frontend/src/components/image-gallery-modal/ImageThumbnailGrid.jsx`.
- Props: `images`, `onImageClick(index, thumbnailElement)`.
- Renders a responsive grid of thumbnails with click handlers.
- Each thumbnail stores a ref for calculating animation origin.

#### 3. Extract `LightboxOverlay` Subcomponent
- File: `frontend/src/components/image-gallery-modal/LightboxOverlay.jsx`.
- Props: `images`, `currentIndex`, `onClose`, `onNavigate(direction)`, `animationOrigin`.
- Renders:
  - Semi-transparent backdrop (click to close).
  - Full-size image with smooth animation.
  - Left/right navigation arrows (chevrons).
  - Close button (top-right X).
  - Image counter: *"3 / 12"*.
- Keyboard handling: registers Arrow Left/Right/Escape listeners on mount.

#### 4. Move Animations
- Move CSS keyframes (`growFromThumb`, `fadeIn`) into a shared stylesheet or keep them inline via Tailwind's `@keyframes` in the component.
- Ensure the origin-based scale calculation logic is portable (accepts `thumbnailElement.getBoundingClientRect()`).

#### 5. Update `ExperienceDetails.jsx`
- Remove all inline lightbox state, handlers, and rendering.
- Replace with:
  ```jsx
  <ImageGalleryModal
    images={experience.images}
    isOpen={isGalleryOpen}
    onClose={() => setIsGalleryOpen(false)}
    initialIndex={selectedImageIndex}
  />
  ```
- Retain the trigger (e.g., "View Gallery" button or thumbnail click) that sets `isGalleryOpen = true` and `selectedImageIndex`.

#### 6. Verify No Regression
- Ensure the ExperienceDetails gallery behavior is identical after refactoring.
- Verify animations, keyboard navigation, and responsive layout.

## Files to Create or Modify

| Action | File |
|--------|------|
| Create | `frontend/src/components/image-gallery-modal/ImageGalleryModal.jsx` |
| Create | `frontend/src/components/image-gallery-modal/ImageThumbnailGrid.jsx` |
| Create | `frontend/src/components/image-gallery-modal/LightboxOverlay.jsx` |
| Modify | `frontend/src/routes/experience-details/ExperienceDetails.jsx` |

## Definition of Done

- [ ] `ImageGalleryModal` is a standalone, reusable component in `components/image-gallery-modal/`.
- [ ] `ImageThumbnailGrid` and `LightboxOverlay` are extracted as subcomponents.
- [ ] All features of the original lightbox are preserved: gallery grid, lightbox view, keyboard navigation, animations.
- [ ] `ExperienceDetails.jsx` uses `<ImageGalleryModal />` instead of inline lightbox code.
- [ ] The component is accessible (ARIA roles, focus trapping, alt text).
- [ ] No visual or functional regression in ExperienceDetails.
- [ ] All existing tests pass; new tests cover the extracted components.
- [ ] Technical documentation updated.

## Testing

### Unit Tests — Frontend

| Test File | Test Cases |
|-----------|------------|
| `ImageGalleryModal.test.jsx` | Renders when `isOpen=true`; does not render when `isOpen=false`; starts at `initialIndex`; calls `onClose` on Escape key; navigates forward/backward with Arrow keys; calls `onClose` on backdrop click |
| `ImageThumbnailGrid.test.jsx` | Renders correct number of thumbnails; calls `onImageClick` with index on click; renders alt text from `accessibleText` |
| `LightboxOverlay.test.jsx` | Displays current image at correct index; navigates on arrow button click; shows image counter (e.g., "3 / 12"); close button calls `onClose`; keyboard listeners registered on mount and cleaned up on unmount |
| `ExperienceDetails.test.jsx` | Gallery modal opens on trigger; closes on callback; no inline lightbox code remains |

### Integration Tests

- Open ExperienceDetails → click thumbnail → verify lightbox opens at correct index.
- Navigate with keyboard → verify image changes.
- Press Escape → verify modal closes.

### Manual Verification

1. Open an experience details page → click an image → verify lightbox opens with animation.
2. Navigate with arrow keys → verify correct image sequence.
3. Click backdrop → verify modal closes.
4. Open gallery grid view → click a thumbnail → verify it opens the lightbox at that image.
5. Verify on mobile: swipe-friendliness, responsive grid.

## Documentation Updates

- **Frontend component docs**: Document `ImageGalleryModal` props, `ImageThumbnailGrid` props, and `LightboxOverlay` props.
- **`docs/architecture-diagrams.md`**: Note the new reusable component in the component hierarchy.
- **`MISSING_FEATURES.md`**: Mark this item as completed once implemented.

## Dependencies

- **Task 020 (Multiple Images in Reviews)** reuses `ImageGalleryModal` for review image galleries.
- **Task 021 (User Images in Experience Gallery)** extends `ImageGalleryModal` to show user-uploaded images alongside organizer images.
