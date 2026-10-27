import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageThumbnailGrid from './ImageThumbnailGrid';

const mixedImages = [
  {
    imageUrl: 'http://example.com/organizer-1.jpg',
    accessibleText: 'Organizer image',
    source: 'organizer',
  },
  {
    imageUrl: 'http://example.com/guest-1.jpg',
    accessibleText: 'Guest image',
    source: 'guest',
  },
];

describe('ImageThumbnailGrid', () => {
  test('renders section headers for mixed organizer and guest images', () => {
    render(
      <ImageThumbnailGrid images={mixedImages} onImageClick={() => {}} title="Gallery" />
    );

    expect(screen.getByText('Experience Photos')).toBeInTheDocument();
    expect(screen.getByText('Guest Photos')).toBeInTheDocument();
  });

  test('omits section headers when all images share the same source', () => {
    render(
      <ImageThumbnailGrid
        images={[mixedImages[0], { ...mixedImages[0], imageUrl: 'http://example.com/organizer-2.jpg' }]}
        onImageClick={() => {}}
        title="Gallery"
      />
    );

    expect(screen.queryByText('Experience Photos')).not.toBeInTheDocument();
    expect(screen.queryByText('Guest Photos')).not.toBeInTheDocument();
  });

  test('keeps original indexes when clicking thumbnails in grouped sections', () => {
    const onImageClick = vi.fn();
    render(
      <ImageThumbnailGrid images={mixedImages} onImageClick={onImageClick} title="Gallery" />
    );

    fireEvent.click(screen.getByAltText('Guest image'));

    expect(onImageClick).toHaveBeenCalledWith(1);
  });
});