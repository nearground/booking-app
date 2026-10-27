import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommentsSection from './CommentsSection';

describe('CommentsSection guest access', () => {
  test('shows a login link without hiding public reviews', () => {
    render(
      <MemoryRouter initialEntries={['/organizer/5?tab=reviews']}>
        <CommentsSection
          userDetails={null}
          comments={[]}
          commentsMetadata={{ totalItems: 0, hasNext: false }}
          commentsSortType="newest"
          commentsPageSize={5}
          renderStars={() => null}
          formatCommentDate={() => ''}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('No reviews found for this selection yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in to comment' })).toHaveAttribute('href', '/login');
  });
});