import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import GuestCommentPrompt from './GuestCommentPrompt';

const LoginReturnLocation = () => {
  const location = useLocation();
  return <output>{JSON.stringify(location.state?.from)}</output>;
};

describe('GuestCommentPrompt', () => {
  test('links to login with the current experience location as the return destination', () => {
    render(
      <MemoryRouter initialEntries={['/experiences/42?session=abc#reviews']}>
        <Routes>
          <Route path="/experiences/:id" element={<GuestCommentPrompt />} />
          <Route path="/login" element={<LoginReturnLocation />} />
        </Routes>
      </MemoryRouter>
    );

    const loginLink = screen.getByRole('link', { name: 'Log in to comment' });
    expect(loginLink).toHaveAttribute('href', '/login');
    fireEvent.click(loginLink);
    expect(screen.getByText(/"pathname":"\/experiences\/42"/)).toBeInTheDocument();
    expect(screen.getByText(/"search":"\?session=abc"/)).toBeInTheDocument();
    expect(screen.getByText(/"hash":"#reviews"/)).toBeInTheDocument();
  });
});