import React, { useState, useCallback, useEffect, useRef } from 'react';
import LightboxOverlay from './LightboxOverlay';
import ImageThumbnailGrid from './ImageThumbnailGrid';
import useModalAccessibility from '../ux/modal/useModalAccessibility';

const galleryAnimationStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes growFromThumb {
  from {
    opacity: 0.75;
    transform: translate(var(--start-x), var(--start-y)) scale(var(--start-scale));
  }
  to {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}
`;

const ImageGalleryModal = ({
  images,
  isOpen,
  onClose,
  initialIndex = 0,
  renderSidebar,
  title = '',
}) => {
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'lightbox'
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [animationOrigin, setAnimationOrigin] = useState(null);
  const activeImage = Array.isArray(images) ? images[currentIndex] : null;
  const dialogRef = useRef(null);
  useModalAccessibility({ isOpen: isOpen && viewMode === 'gallery' && Boolean(images?.length), onClose, dialogRef });

  useEffect(() => {
    if (isOpen) {
      setViewMode('gallery');
      setCurrentIndex(initialIndex);
      setAnimationOrigin(null);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen || !images?.length) return undefined;
    const previousOverflow = document.body.style.overflow;
    if (previousOverflow === 'hidden') return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen, images?.length]);

  const openLightbox = useCallback((index) => {
    setAnimationOrigin(null);
    setCurrentIndex(index);
    setViewMode('lightbox');
  }, []);

  const closeLightbox = useCallback(() => {
    setViewMode('gallery');
    setAnimationOrigin(null);
  }, []);

  const navigateImage = useCallback(
    (direction) => {
      setAnimationOrigin(null);
      setCurrentIndex((prev) => {
        if (direction < 0) return prev === 0 ? images.length - 1 : prev - 1;
        return prev === images.length - 1 ? 0 : prev + 1;
      });
    },
    [images.length]
  );

  if (!isOpen || !images || images.length === 0) return null;

  return (
    <>
      <style>{galleryAnimationStyles}</style>

      {viewMode === 'lightbox' ? (
        <LightboxOverlay
          images={images}
          currentIndex={currentIndex}
          onClose={closeLightbox}
          onNavigate={navigateImage}
          onOpenGallery={() => setViewMode('gallery')}
          animationOrigin={animationOrigin}
          sidebar={typeof renderSidebar === 'function' ? renderSidebar(activeImage) : null}
          title={title}
        />
      ) : (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="responsive-overlay fixed inset-0 z-50 bg-black/85 overflow-y-auto overscroll-contain"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <div
            className="mx-auto w-full min-w-0 max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-3 rounded-xl bg-black/70 px-4 py-2 text-white backdrop-blur-sm">
              <p className="min-w-0 break-words text-sm md:text-base font-medium">{title}</p>
              <button
                type="button"
                className="shrink-0 min-w-11 min-h-11 text-white text-3xl leading-none"
                onClick={onClose}
                aria-label="Close photos gallery"
              >
                ×
              </button>
            </div>

            <ImageThumbnailGrid
              images={images}
              onImageClick={openLightbox}
              title={title}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGalleryModal;
