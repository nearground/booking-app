import React from 'react';
import { render, screen } from '@testing-library/react';
import LightboxOverlay from './LightboxOverlay';

const images = [
  { imageUrl: 'http://example.com/1.jpg', accessibleText: 'Image one' },
];

describe('LightboxOverlay', () => {
  test('does not lock page scrolling when no active image exists', () => {
    render(
      <LightboxOverlay images={[]} currentIndex={0} onClose={() => {}} onNavigate={() => {}} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  test('renders image-only layout when no sidebar content is provided', () => {
    render(
      <LightboxOverlay
        images={images}
        currentIndex={0}
        onClose={() => {}}
        onNavigate={() => {}}
        onOpenGallery={() => {}}
        title="Gallery"
      />
    );

    expect(screen.queryByTestId('lightbox-sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('lightbox-content')).toHaveClass('items-center');
    expect(screen.getByRole('img')).toHaveClass('max-w-full', 'max-h-[78dvh]');
  });

  test('renders sidebar layout when sidebar content is provided', () => {
    render(
      <LightboxOverlay
        images={images}
        currentIndex={0}
        onClose={() => {}}
        onNavigate={() => {}}
        onOpenGallery={() => {}}
        sidebar={<aside aria-label="Review context">Review sidebar</aside>}
        title="Gallery"
      />
    );

    expect(screen.getByTestId('lightbox-sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Review context')).toHaveTextContent('Review sidebar');
    expect(screen.getByTestId('lightbox-content')).toHaveClass('flex-col');
    expect(screen.getByTestId('lightbox-content')).toHaveClass('lg:flex-row');
    expect(screen.getByRole('img')).toHaveClass('max-w-full');
  });
});