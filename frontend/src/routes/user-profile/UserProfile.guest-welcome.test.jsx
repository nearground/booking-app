import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import UserProfile from './UserProfile';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn() },
}));
vi.mock('hooks/useOutsideClickHandler', () => ({ default: vi.fn() }));
vi.mock('components/ux/tabs/Tabs', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('components/ux/tab-panel/TabPanel', () => ({ default: ({ children }) => <section>{children}</section> }));
vi.mock('./components/PaymentsMethodsPanel', () => ({ default: () => null }));
vi.mock('./components/ProfileDetailsPanel', () => ({ default: () => null }));
vi.mock('./components/BookingPanel', () => ({ default: ({ orders }) => <p>{orders.length} bookings</p> }));
vi.mock('components/comments/CommentsSection', () => ({ default: () => null }));

afterEach(() => cleanup());

describe('UserProfile guest receipt welcome', () => {
  it('shows a dismissible welcome and loads claimed bookings', async () => {
    networkAdapter.get.mockImplementation((url) => Promise.resolve({
      errors: [],
      data: url === '/api/orders' ? { orders: [{ orderNumber: 'ORD-guest' }] } : { elements: [] },
    }));
    const auth = { userDetails: { id: 8, username: 'guestbuyer' } };

    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/user-profile?welcome=1']}>
          <Routes><Route path="/user-profile" element={<UserProfile />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Welcome!' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('1 bookings')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Welcome!' })).not.toBeInTheDocument());
  });
});
