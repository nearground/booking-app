import React, { useState, useCallback, useEffect } from 'react';
import LightboxOverlay from './LightboxOverlay';
import ImageThumbnailGrid from './ImageThumbnailGrid';

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

  useEffect(() => {
    if (isOpen) {
      setViewMode('gallery');
      setCurrentIndex(initialIndex);
      setAnimationOrigin(null);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (viewMode !== 'gallery') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, onClose]);

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
          className="fixed inset-0 z-50 bg-black/85 p-4 md:p-6 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <div
            className="mx-auto w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-center rounded-xl bg-black/70 px-4 py-3 text-white backdrop-blur-sm">
              <p className="text-sm md:text-base font-medium text-center">{title}</p>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl leading-none"
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
