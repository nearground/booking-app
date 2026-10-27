import {
  buildExperienceGalleryImages,
  getOrganizerGalleryImages,
} from './experienceGalleryImages';

describe('experienceGalleryImages', () => {
  test('builds an organizer-first combined gallery with guest review metadata', () => {
    const galleryImages = buildExperienceGalleryImages(
      {
        title: 'Sunset Cruise',
        images: [{ imageUrl: 'http://example.com/organizer-1.jpg' }],
      },
      [
        {
          id: 44,
          title: 'Amazing trip',
          comment: 'We loved every part of it.',
          stars: 5,
          anonymity: 2,
          commenter: { firstName: 'Alex', lastName: 'D' },
          images: [{ imageUrl: 'http://example.com/guest-1.jpg' }],
        },
      ]
    );

    expect(galleryImages).toHaveLength(2);
    expect(galleryImages[0]).toMatchObject({
      imageUrl: 'http://example.com/organizer-1.jpg',
      source: 'organizer',
    });
    expect(galleryImages[1]).toMatchObject({
      imageUrl: 'http://example.com/guest-1.jpg',
      source: 'guest',
      review: {
        id: 44,
        title: 'Amazing trip',
        comment: 'We loved every part of it.',
        stars: 5,
        anonymity: 2,
        commenter: { firstName: 'Alex', lastName: 'D' },
      },
    });
  });

  test('uses the thumbnail fallback and ignores reply images', () => {
    const organizerImages = getOrganizerGalleryImages({
      title: 'Sunset Cruise',
      thumbnail: 'http://example.com/fallback.jpg',
    });
    const galleryImages = buildExperienceGalleryImages(
      {
        title: 'Sunset Cruise',
        thumbnail: 'http://example.com/fallback.jpg',
      },
      [
        {
          id: 55,
          ParentId: 10,
          title: 'Reply photo',
          images: [{ imageUrl: 'http://example.com/reply-image.jpg' }],
        },
        {
          id: 56,
          title: 'Guest upload',
          comment: 'Worth it.',
          images: [{ imageUrl: 'http://example.com/guest-2.jpg' }],
        },
      ]
    );

    expect(organizerImages).toMatchObject([
      {
        imageUrl: 'http://example.com/fallback.jpg',
        source: 'organizer',
      },
    ]);
    expect(galleryImages).toHaveLength(2);
    expect(galleryImages[0]).toMatchObject({
      imageUrl: 'http://example.com/fallback.jpg',
      source: 'organizer',
    });
    expect(galleryImages[1]).toMatchObject({
      imageUrl: 'http://example.com/guest-2.jpg',
      source: 'guest',
    });
  });
});