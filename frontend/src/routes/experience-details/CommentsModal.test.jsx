import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  test('traps focus, dismisses with Escape and restores the opener and scroll state', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(
      <MemoryRouter>
        <CommentsModal isOpen onClose={onClose} comments={[]} />
      </MemoryRouter>
    );
    const close = screen.getByRole('button', { name: 'Close comments' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(screen.getByRole('link', { name: 'Log in to comment' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    opener.remove();
  });

  test('empty state spans only the columns present on narrow screens', () => {
    render(
      <MemoryRouter>
        <CommentsModal isOpen onClose={() => {}} comments={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText('No comments found.')).not.toHaveClass('col-span-2');
  });
});