import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommentsModal from './CommentsModal';

describe('CommentsModal guest access', () => {
  test('shows a login link while preserving public comment reading', () => {
    render(
      <MemoryRouter initialEntries={['/experiences/42?tab=reviews']}>
        <CommentsModal isOpen onClose={() => {}} comments={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText('All Comments (0)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in to comment' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: 'Post Comment' })).not.toBeInTheDocument();
  });
});