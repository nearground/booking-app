import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from 'test-utils/index';
import ForgotUsername from './ForgotUsername';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    post: vi.fn(),
  },
}));

import { networkAdapter } from 'services/NetworkAdapter';

describe('ForgotUsername', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders email input and submit button', () => {
    renderWithProviders(<ForgotUsername />);

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /look up username/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/forgot your username/i)).toBeInTheDocument();
  });

  test('shows error for invalid email', async () => {
    renderWithProviders(<ForgotUsername />);

    const form = screen.getByRole('button', { name: /look up username/i }).closest('form');
    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'notanemail', name: 'email' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  test('shows success message after submission', async () => {
    networkAdapter.post.mockResolvedValue({
      errors: [],
      data: { status: 'If an account with that email exists, you will receive an email with your username(s).' },
    });

    renderWithProviders(<ForgotUsername />);

    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com', name: 'email' } });
    fireEvent.click(screen.getByRole('button', { name: /look up username/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    expect(networkAdapter.post).toHaveBeenCalledWith('/api/users/lookup-username', {
      email: 'test@example.com',
    });
  });

  test('has a link back to login', () => {
    renderWithProviders(<ForgotUsername />);

    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });
});
