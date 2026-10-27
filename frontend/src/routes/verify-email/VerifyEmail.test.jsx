import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmail from './VerifyEmail';

vi.mock('services/NetworkAdapter', () => ({ networkAdapter: { post: vi.fn() } }));
import { networkAdapter } from 'services/NetworkAdapter';

const renderWithToken = (token = 'verification-token') => render(
  <MemoryRouter initialEntries={[`/verify-email${token ? `?token=${token}` : ''}`]}>
    <Routes><Route path="/verify-email" element={<VerifyEmail />} /></Routes>
  </MemoryRouter>
);

beforeEach(() => vi.clearAllMocks());

describe('VerifyEmail', () => {
  test('confirms token and reports claimed guest bookings', async () => {
    networkAdapter.post.mockResolvedValue({ data: { emailVerified: true, claimedOrderCount: 2 }, errors: [] });
    renderWithToken();
    await waitFor(() => expect(screen.getByText('2 guest bookings added to your account.')).toBeInTheDocument());
    expect(networkAdapter.post).toHaveBeenCalledWith('/api/users/email-verification/confirm', { token: 'verification-token' });
    expect(screen.getByRole('link', { name: /log in to view bookings/i })).toHaveAttribute('href', '/login');
  });

  test('shows API rejection for invalid tokens', async () => {
    networkAdapter.post.mockResolvedValue({ data: {}, errors: ['Verification link is invalid or expired'] });
    renderWithToken();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('invalid or expired'));
  });

  test('does not request verification when the URL token is missing', async () => {
    renderWithToken('');
    expect(await screen.findByRole('alert')).toHaveTextContent('missing a token');
    expect(networkAdapter.post).not.toHaveBeenCalled();
  });
});