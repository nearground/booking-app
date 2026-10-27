import React, { useContext } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthContext } from 'contexts/AuthContext';
import { CartContext, CartProvider } from './CartContext';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { networkAdapter } from 'services/NetworkAdapter';

const Probe = () => {
  const { cart, cartNotice, isLoading } = useContext(CartContext);
  return <div><span data-testid="item">{cart?.Items?.[0]?.description || 'empty'}</span><span data-testid="loading">{String(isLoading)}</span><span data-testid="notice">{cartNotice}</span></div>;
};

const renderWithAuth = (isAuthenticated) => render(
  <AuthContext.Provider value={{ isAuthenticated }}>
    <CartProvider><Probe /></CartProvider>
  </AuthContext.Provider>
);

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
};

beforeEach(() => vi.clearAllMocks());

describe('CartProvider auth refresh', () => {
  test('uses the post-login cart when an earlier guest request resolves late', async () => {
    const guestResponse = deferred();
    const accountResponse = deferred();
    networkAdapter.get.mockReturnValueOnce(guestResponse.promise).mockReturnValueOnce(accountResponse.promise);
    const view = renderWithAuth(false);

    view.rerender(
      <AuthContext.Provider value={{ isAuthenticated: true }}>
        <CartProvider><Probe /></CartProvider>
      </AuthContext.Provider>
    );
    expect(networkAdapter.get).toHaveBeenCalledTimes(2);

    await act(async () => {
      accountResponse.resolve({ data: { cart: { Items: [{ description: 'account ticket' }] } }, errors: [] });
      await accountResponse.promise;
    });
    await act(async () => {
      guestResponse.resolve({ data: { cart: { Items: [{ description: 'guest ticket' }] } }, errors: [] });
      await guestResponse.promise;
    });

    expect(screen.getByTestId('item')).toHaveTextContent('account ticket');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  test('clears loading state when the network request rejects', async () => {
    networkAdapter.get.mockRejectedValueOnce(new Error('offline'));
    renderWithAuth(false);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  });

  test('exposes the server notice when legacy cart lines were removed', async () => {
    networkAdapter.get.mockResolvedValueOnce({ data: { cart: { Items: [] }, notice: 'Hotel items were removed.' }, errors: [] });
    renderWithAuth(false);
    await waitFor(() => expect(screen.getByTestId('notice')).toHaveTextContent('Hotel items were removed.'));
  });});