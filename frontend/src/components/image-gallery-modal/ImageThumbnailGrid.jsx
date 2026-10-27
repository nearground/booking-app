import React from 'react';

const ImageThumbnailGrid = ({ images, onImageClick, title }) => {
  const organizerImages = [];
  const guestImages = [];

  images.forEach((image, index) => {
    const imageEntry = { image, index };

    if (image?.source === 'guest') {
      guestImages.push(imageEntry);
      return;
    }

    organizerImages.push(imageEntry);
  });

  const showSections = organizerImages.length > 0 && guestImages.length > 0;

  const renderImageButton = ({ image, index }) => (
    <button
      key={`${image.imageUrl}-${index}`}
      type="button"
      className="mb-4 block w-full break-inside-avoid"
      onClick={() => onImageClick(index)}
    >
      <img
        src={image.imageUrl}
        alt={image.accessibleText || `${title || 'Gallery'} photo ${index + 1}`}
        className="w-full min-h-11 aspect-[4/3] rounded-xl object-cover"
        loading="lazy"
      />
    </button>
  );

  if (!showSections) {
    return (
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
        {images.map((image, index) => renderImageButton({ image, index }))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {organizerImages.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Experience Photos
          </h2>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {organizerImages.map(renderImageButton)}
          </div>
        </section>
      ) : null}

      {guestImages.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Guest Photos
          </h2>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {guestImages.map(renderImageButton)}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ImageThumbnailGrid;
