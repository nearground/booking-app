import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { CartContext } from 'contexts/CartContext';
import { networkAdapter } from 'services/NetworkAdapter';
import CartModal from './CartModal';

vi.mock('services/NetworkAdapter', () => ({
  networkAdapter: { post: vi.fn() },
}));

afterEach(() => cleanup());

describe('CartModal guest checkout', () => {
  it.each([true, false])('submits guest checkout with save-for-later=%s without collecting payment card data', async (saveForLater) => {
    const refreshCart = vi.fn().mockResolvedValue();
    const closeCart = vi.fn();
    networkAdapter.post.mockResolvedValue({
      errors: [],
      data: { orderNumber: 'ORD-guest', status: 'confirmed', totalAmount: 25, items: [] },
    });

    render(
      <AuthContext.Provider value={{ isAuthenticated: false, userDetails: null }}>
        <CartContext.Provider value={{
          cart: { id: 7 },
          cartItems: [{ id: 3, description: 'Experience ticket', totalPrice: 25, metadata: { ticketSelections: [] } }],
          isCartOpen: true,
          isLoading: false,
          cartNotice: null,
          dismissCartNotice: vi.fn(),
          closeCart,
          removeFromCart: vi.fn(),
          refreshCart,
        }}>
          <MemoryRouter>
            <Routes>
              <Route path="/booking-confirmation" element={<p>Guest receipt</p>} />
              <Route path="*" element={<CartModal />} />
            </Routes>
          </MemoryRouter>
        </CartContext.Provider>
      </AuthContext.Provider>,
    );

    expect(screen.queryByTestId('cart-modal__payment-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('cart-modal__save-booking')).toBeChecked();
    if (!saveForLater) fireEvent.click(screen.getByTestId('cart-modal__save-booking'));
    fireEvent.change(screen.getByTestId('cart-modal__contact-name'), { target: { value: 'Guest Buyer' } });
    fireEvent.change(screen.getByTestId('cart-modal__contact-phone'), { target: { value: '5551234' } });
    fireEvent.change(screen.getByTestId('cart-modal__contact-email'), { target: { value: 'guest@example.com' } });
    fireEvent.change(screen.getByTestId('cart-modal__billing-address'), { target: { value: '1 Main St' } });
    fireEvent.change(screen.getByTestId('cart-modal__billing-city'), { target: { value: 'Town' } });
    fireEvent.change(screen.getByTestId('cart-modal__billing-state'), { target: { value: 'CA' } });
    fireEvent.change(screen.getByTestId('cart-modal__billing-zip'), { target: { value: '90210' } });
    fireEvent.click(screen.getByTestId('cart-modal__checkout-btn'));

    await waitFor(() => expect(screen.getByText('Guest receipt')).toBeInTheDocument());
    expect(networkAdapter.post).toHaveBeenCalledWith('/api/cart/checkout', expect.objectContaining({ cartId: 7, saveBookingForLater: saveForLater }));
    expect(networkAdapter.post.mock.calls[0][1]).not.toHaveProperty('payment');
    expect(refreshCart).toHaveBeenCalledOnce();
    expect(closeCart).toHaveBeenCalledOnce();
  });
});
