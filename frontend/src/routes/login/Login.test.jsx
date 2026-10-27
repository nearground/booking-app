import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { AuthContext } from 'contexts/AuthContext';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { networkAdapter } from 'services/NetworkAdapter';

const renderLogin = (authOverrides = {}) => {
  const authValue = {
    isAuthenticated: false,
    userDetails: null,
    isAuthResolved: true,
    triggerAuthCheck: vi.fn().mockResolvedValue(true),
    ...authOverrides,
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login', () => {
  test('renders username field instead of email', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
  });

  test('renders password field', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  test('shows organizer login toggle', () => {
    renderLogin();
    expect(screen.getByText('Organizer Login')).toBeInTheDocument();
  });

  test('shows organization username field when organizer toggle is checked', () => {
    renderLogin();
    expect(screen.queryByPlaceholderText('Organization Username')).not.toBeInTheDocument();

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(screen.getByPlaceholderText('Organization Username')).toBeInTheDocument();
  });

  test('submits username and password for regular login', async () => {
    networkAdapter.post.mockResolvedValue({ data: { token: 'abc' }, errors: [] });

    const triggerAuthCheck = vi.fn().mockResolvedValue(true);
    renderLogin({ triggerAuthCheck });

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { name: 'username', value: 'user1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { name: 'password', value: 'testpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(networkAdapter.post).toHaveBeenCalledWith('api/users/login', {
        username: 'user1',
        password: 'testpassword',
      });
    });
  });

  test('submits organizationUsername for organizer login', async () => {
    networkAdapter.post.mockResolvedValue({ data: { token: 'abc' }, errors: [] });

    const triggerAuthCheck = vi.fn().mockResolvedValue(true);
    renderLogin({ triggerAuthCheck });

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    fireEvent.change(screen.getByPlaceholderText('Organization Username'), {
      target: { name: 'organizationUsername', value: 'martinllc' },
    });
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { name: 'username', value: 'admin' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { name: 'password', value: 'adminpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(networkAdapter.post).toHaveBeenCalledWith('api/users/login', {
        username: 'admin',
        password: 'adminpassword',
        organizationUsername: 'martinllc',
      });
    });
  });

  test('shows error when username is empty', async () => {
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { name: 'password', value: 'somepass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid username and password/i)).toBeInTheDocument();
    });
  });

  test('displays test user hint with username', () => {
    vi.stubEnv('NODE_ENV', 'development');
    try {
      renderLogin();
      expect(screen.getByText('Username: user1')).toBeInTheDocument();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
