import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageCard from 'components/image-card/ImageCard';

describe('ImageCard', () => {
  test('renders the destination name', () => {
    render(
      <ImageCard
        name="Mumbai"
        imageUrl="http://x.com/img.jpg"
        onPopularDestincationCardClick={() => {}}
      />
    );
    expect(screen.getByText('Mumbai')).toBeInTheDocument();
  });

  test('renders image with the provided src', () => {
    render(
      <ImageCard
        name="Mumbai"
        imageUrl="http://x.com/img.jpg"
        onPopularDestincationCardClick={() => {}}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://x.com/img.jpg');
  });

  test('renders element with data-testid="image-card"', () => {
    render(
      <ImageCard
        name="Paris"
        imageUrl="http://x.com/img.jpg"
        onPopularDestincationCardClick={() => {}}
      />
    );
    expect(screen.getByTestId('image-card')).toBeInTheDocument();
  });

  test('calls onPopularDestincationCardClick with the card name when clicked', () => {
    const onClick = vi.fn();
    render(
      <ImageCard
        name="Dubai"
        imageUrl="http://x.com/img.jpg"
        onPopularDestincationCardClick={onClick}
      />
    );
    fireEvent.click(screen.getByTestId('image-card'));
    expect(onClick).toHaveBeenCalledWith('Dubai');
  });

  test('callback receives the correct name argument', () => {
    const onClick = vi.fn();
    render(
      <ImageCard
        name="Paris"
        imageUrl="http://x.com/img.jpg"
        onPopularDestincationCardClick={onClick}
      />
    );
    fireEvent.click(screen.getByTestId('image-card'));
    expect(onClick).toHaveBeenCalledWith('Paris');
  });

  test('callback is not called before any interaction', () => {
    const onClick = vi.fn();
    render(
      <ImageCard
        name="Tokyo"
        imageUrl="http://x.com/img.jpg"
        onPopularDestincationCardClick={onClick}
      />
    );
    expect(onClick).toHaveBeenCalledTimes(0);
  });
});
