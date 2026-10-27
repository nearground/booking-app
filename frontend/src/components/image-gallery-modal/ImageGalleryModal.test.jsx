import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageGalleryModal from './ImageGalleryModal';

const mockImages = [
  { imageUrl: 'http://example.com/1.jpg', accessibleText: 'Image one' },
  { imageUrl: 'http://example.com/2.jpg', accessibleText: 'Image two' },
  { imageUrl: 'http://example.com/3.jpg', accessibleText: 'Image three' },
];

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
    review: {
      title: 'Amazing trip',
      comment: 'We loved every part of it.',
      stars: 5,
    },
  },
];

describe('ImageGalleryModal', () => {
  test('restores page scrolling when unmounted with a nested lightbox open', () => {
    const { unmount } = render(
      <ImageGalleryModal images={mockImages} isOpen onClose={() => {}} />
    );
    fireEvent.click(screen.getAllByRole('img')[0]);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  test('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ImageGalleryModal images={mockImages} isOpen={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  test('renders gallery when isOpen is true', () => {
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={() => {}} title="Test Gallery" />
    );
    expect(screen.getByText('Test Gallery')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  test('renders nothing when images array is empty', () => {
    const { container } = render(
      <ImageGalleryModal images={[]} isOpen={true} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  test('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={onClose} title="Test" />
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose on Escape key in gallery mode', () => {
    const onClose = vi.fn();
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={onClose} />
    );
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('opens lightbox when thumbnail is clicked', () => {
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={() => {}} title="Test" />
    );
    // Click second image thumbnail
    const thumbnails = screen.getAllByRole('img');
    fireEvent.click(thumbnails[1]);
    // Should now show lightbox with image counter
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  test('navigates images in lightbox with arrow keys', () => {
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={() => {}} title="Test" />
    );
    // Open lightbox on first image
    fireEvent.click(screen.getAllByRole('img')[0]);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Navigate forward
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    // Navigate backward
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  test('wraps around when navigating past boundaries', () => {
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={() => {}} title="Test" />
    );
    // Open lightbox on first image
    fireEvent.click(screen.getAllByRole('img')[0]);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Navigate backward past start (should wrap to last)
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  test('close button in gallery header closes modal', () => {
    const onClose = vi.fn();
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={onClose} title="Test" />
    );
    fireEvent.click(screen.getByLabelText('Close photos gallery'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape in lightbox returns to gallery, not closes modal', () => {
    const onClose = vi.fn();
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={onClose} title="Test" />
    );
    // Open lightbox
    fireEvent.click(screen.getAllByRole('img')[0]);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Escape should close lightbox back to gallery, not close modal
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    // Gallery should be visible again with all thumbnails
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  test('renders alt text from image accessibleText', () => {
    render(
      <ImageGalleryModal images={mockImages} isOpen={true} onClose={() => {}} title="Test" />
    );
    expect(screen.getByAltText('Image one')).toBeInTheDocument();
    expect(screen.getByAltText('Image two')).toBeInTheDocument();
    expect(screen.getByAltText('Image three')).toBeInTheDocument();
  });

  test('renders section headers when organizer and guest images are mixed', () => {
    render(
      <ImageGalleryModal images={mixedImages} isOpen={true} onClose={() => {}} title="Test" />
    );

    expect(screen.getByText('Experience Photos')).toBeInTheDocument();
    expect(screen.getByText('Guest Photos')).toBeInTheDocument();
  });

  test('renders sidebar content for guest photos in lightbox', () => {
    const renderSidebar = vi.fn((image) =>
      image.source === 'guest' ? <div aria-label="Review context">Guest review sidebar</div> : null
    );

    render(
      <ImageGalleryModal
        images={mixedImages}
        isOpen={true}
        onClose={() => {}}
        renderSidebar={renderSidebar}
        title="Test"
      />
    );

    fireEvent.click(screen.getByAltText('Guest image'));

    expect(screen.getByLabelText('Review context')).toHaveTextContent('Guest review sidebar');
    expect(renderSidebar).toHaveBeenLastCalledWith(mixedImages[1]);
  });

  test('keeps organizer photos image-only when sidebar renderer returns null', () => {
    render(
      <ImageGalleryModal
        images={mixedImages}
        isOpen={true}
        onClose={() => {}}
        renderSidebar={(image) =>
          image.source === 'guest' ? <div aria-label="Review context">Guest review sidebar</div> : null
        }
        title="Test"
      />
    );

    fireEvent.click(screen.getByAltText('Organizer image'));

    expect(screen.queryByLabelText('Review context')).not.toBeInTheDocument();
  });
});
