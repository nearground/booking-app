const isValidGalleryImage = (image) =>
  Boolean(image && typeof image.imageUrl === 'string' && image.imageUrl.trim());

const normalizeGalleryImage = (image, fallbackAccessibleText) => ({
  ...image,
  imageUrl: image.imageUrl.trim(),
  accessibleText:
    typeof image.accessibleText === 'string' && image.accessibleText.trim()
      ? image.accessibleText.trim()
      : fallbackAccessibleText,
});

export const getOrganizerGalleryImages = (experienceData) => {
  const organizerImages = (Array.isArray(experienceData?.images)
    ? experienceData.images
    : []
  )
    .filter(isValidGalleryImage)
    .map((image, index) => ({
      ...normalizeGalleryImage(
        image,
        `${experienceData?.title || 'Experience'} photo ${index + 1}`
      ),
      source: 'organizer',
    }));

  if (organizerImages.length > 0) {
    return organizerImages;
  }

  if (typeof experienceData?.thumbnail === 'string' && experienceData.thumbnail.trim()) {
    return [
      {
        imageUrl: experienceData.thumbnail.trim(),
        accessibleText: `${experienceData?.title || 'Experience'} thumbnail`,
        source: 'organizer',
      },
    ];
  }

  return [];
};

export const buildExperienceGalleryImages = (experienceData, comments = []) => {
  const organizerImages = getOrganizerGalleryImages(experienceData);
  const guestImages = (Array.isArray(comments) ? comments : [])
    .filter((comment) => comment && !comment.ParentId)
    .flatMap((comment) => {
      const reviewImages = (Array.isArray(comment.images) ? comment.images : []).filter(
        isValidGalleryImage
      );

      return reviewImages.map((image, imageIndex) => ({
        ...normalizeGalleryImage(
          image,
          `${comment?.title || 'Guest review'} photo ${imageIndex + 1}`
        ),
        source: 'guest',
        review: {
          id: comment.id,
          title: comment.title || '',
          comment: comment.comment || '',
          stars: comment.stars,
          anonymity: comment.anonymity,
          commenter: comment.commenter || comment.user || null,
          commenterName: comment.commenterName || comment.userName || '',
          createdAt: comment.createdAt || null,
        },
      }));
    });

  return [...organizerImages, ...guestImages];
};