import React, { useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImages } from '@fortawesome/free-solid-svg-icons';
import useModalAccessibility from '../ux/modal/useModalAccessibility';

const LightboxOverlay = ({
  images,
  currentIndex,
  onClose,
  onNavigate,
  onOpenGallery,
  animationOrigin,
  sidebar,
  title,
}) => {
  const activeImage = images[currentIndex];
  const hasSidebar = Boolean(sidebar);
  const dialogRef = useRef(null);
  useModalAccessibility({ isOpen: Boolean(activeImage), onClose, dialogRef });

  const handleKeyDown = useCallback(
    (event) => {
      if (event.defaultPrevented) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onNavigate(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNavigate(1);
      }
    },
    [onNavigate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!activeImage) return undefined;
    const previousOverflow = document.body.style.overflow;
    if (previousOverflow === 'hidden') return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [activeImage]);

  if (!activeImage) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="responsive-overlay fixed inset-0 z-50 bg-black/80 flex items-center justify-center overflow-y-auto transition-opacity duration-500 ease-out animate-[fadeIn_420ms_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm md:text-base font-medium">
        {currentIndex + 1} / {images.length}
      </div>

      <button
        type="button"
        className="absolute z-10 top-1/2 -translate-y-1/2 left-4 md:left-8 h-24 md:h-28 w-12 md:w-14 rounded-2xl bg-black/60 hover:bg-black/75 text-white text-5xl leading-none flex items-center justify-center"
        onClick={(event) => {
          event.stopPropagation();
          onNavigate(-1);
        }}
        aria-label="Previous image"
      >
        ‹
      </button>

      <div
        className={`relative mx-auto flex w-full min-w-0 items-center justify-center transition-all duration-300 ease-out ${
          hasSidebar ? 'max-w-7xl' : 'max-w-6xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          data-testid="lightbox-content"
          className={`flex w-full min-w-0 justify-center gap-4 transition-all duration-300 ease-out ${
            hasSidebar ? 'flex-col lg:flex-row lg:items-stretch' : 'items-center'
          }`}
        >
          {hasSidebar ? (
            <div
              data-testid="lightbox-sidebar"
              className="w-full min-w-0 max-h-[28dvh] overflow-y-auto lg:max-h-[78dvh] lg:max-w-md xl:max-w-lg"
            >
              {sidebar}
            </div>
          ) : null}

          <div className={`flex w-full min-w-0 items-center justify-center ${hasSidebar ? 'lg:flex-1' : ''}`}>
            <img
              key={currentIndex}
              src={activeImage.imageUrl}
              alt={activeImage.accessibleText || title || 'Image'}
              className={`${
                hasSidebar ? 'max-w-full max-h-[48dvh] lg:max-h-[78dvh]' : 'max-w-full max-h-[78dvh]'
              } object-contain rounded-lg transition-all duration-300 ease-out ${
                animationOrigin
                  ? 'animate-[growFromThumb_560ms_cubic-bezier(0.22,1,0.36,1)]'
                  : 'animate-[zoomIn_520ms_ease-out]'
              }`}
              style={
                animationOrigin
                  ? {
                      '--start-x': `${animationOrigin.x}px`,
                      '--start-y': `${animationOrigin.y}px`,
                      '--start-scale': animationOrigin.scale,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="absolute z-10 top-1/2 -translate-y-1/2 right-4 md:right-8 h-24 md:h-28 w-12 md:w-14 rounded-2xl bg-black/60 hover:bg-black/75 text-white text-5xl leading-none flex items-center justify-center"
        onClick={(event) => {
          event.stopPropagation();
          onNavigate(1);
        }}
        aria-label="Next image"
      >
        ›
      </button>

      {onOpenGallery && (
        <button
          type="button"
          className="absolute z-10 top-4 left-4 h-12 w-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/75"
          onClick={(event) => {
            event.stopPropagation();
            onOpenGallery();
          }}
          aria-label="Open photos gallery"
        >
          <FontAwesomeIcon icon={faImages} className="text-lg" />
        </button>
      )}

      <button
        type="button"
        className="absolute z-10 top-4 right-4 min-h-11 min-w-11 text-white text-3xl leading-none"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Close image preview"
      >
        ×
      </button>
    </div>
  );
};

export default LightboxOverlay;
