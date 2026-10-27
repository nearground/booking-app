import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommentCard from './CommentCard';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    get: vi.fn().mockResolvedValue({ ok: true, data: { elements: [] }, errors: [] }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

vi.mock('../image-gallery-modal/ImageGalleryModal', () => ({
  default: ({ isOpen, initialIndex, images }) => (
    isOpen ? <div data-testid="gallery-modal">index:{initialIndex}-count:{images.length}</div> : null
  ),
}));

const baseComment = {
  id: 1,
  stars: 5,
  title: 'Great experience',
  comment: 'Amazing tour with awesome guides.',
  anonymity: 2,
  createdAt: '2026-04-10T12:00:00Z',
  repliesCount: 0,
  commenter: { id: 2, firstName: 'Alex', lastName: 'D', city: 'Lisbon', country: 'PT' },
  target: { type: 'experience', id: 99, name: 'Sunset Tour' },
};

const renderCard = (commentOverrides = {}) =>
  render(
    <CommentCard
      comment={{ ...baseComment, ...commentOverrides }}
      userDetails={{ id: 999 }}
      renderStars={(stars) => `${stars} stars`}
      formatCommentDate={() => 'Apr 10, 2026'}
      loadComments={() => {}}
      commentsTargetType="experience"
    />
  );

describe('CommentCard review images', () => {
  test('renders no thumbnails when images are empty', () => {
    renderCard({ images: [] });
    expect(screen.queryByAltText(/Review image/i)).not.toBeInTheDocument();
  });

  test('renders three thumbnails for three images', () => {
    renderCard({
      images: [
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/1.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/2.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/3.jpg' },
      ],
    });

    expect(screen.getByAltText('Review image 1')).toBeInTheDocument();
    expect(screen.getByAltText('Review image 2')).toBeInTheDocument();
    expect(screen.getByAltText('Review image 3')).toBeInTheDocument();
  });

  test('renders +X overlay on the third thumbnail when more than three images exist', () => {
    renderCard({
      images: [
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/1.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/2.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/3.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/4.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/5.jpg' },
      ],
    });

    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  test('clicking a thumbnail opens gallery modal with correct initial index', async () => {
    renderCard({
      images: [
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/1.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/2.jpg' },
        { imageUrl: 'http://localhost:4000/api/media/object/users/1/review-image/3.jpg' },
      ],
    });

    fireEvent.click(screen.getByAltText('Review image 2'));

    await waitFor(() => {
      expect(screen.getByTestId('gallery-modal')).toHaveTextContent('index:1-count:3');
    });
  });
});
