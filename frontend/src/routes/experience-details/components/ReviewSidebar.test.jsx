import React from 'react';
import { render, screen } from '@testing-library/react';
import ReviewSidebar from './ReviewSidebar';

describe('ReviewSidebar', () => {
  test('renders reviewer name, rating, title, and body text', () => {
    render(
      <ReviewSidebar
        review={{
          commenter: { firstName: 'Alex', lastName: 'D' },
          stars: 4,
          title: 'Amazing trip',
          comment: 'We loved every part of it.',
          anonymity: 2,
        }}
      />
    );

    expect(screen.getByText('Alex D')).toBeInTheDocument();
    expect(screen.getByLabelText('4 star review')).toBeInTheDocument();
    expect(screen.getByText('Amazing trip')).toBeInTheDocument();
    expect(screen.getByText('We loved every part of it.')).toBeInTheDocument();
  });

  test('shows Anonymous for anonymous reviews', () => {
    render(
      <ReviewSidebar
        review={{
          commenter: { firstName: 'Alex', lastName: 'D' },
          stars: 5,
          title: 'Hidden identity',
          comment: 'Still a great day.',
          anonymity: 0,
        }}
      />
    );

    expect(screen.getAllByText('Anonymous').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alex D')).not.toBeInTheDocument();
  });
});