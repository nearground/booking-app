import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CartContext } from 'contexts/CartContext';
import CartFAB from './CartFAB';

describe('CartFAB', () => {
  test('shows cleanup notice even when legacy items leave an empty cart', () => {
    const dismissCartNotice = vi.fn();
    render(
      <CartContext.Provider value={{ cartCount: 0, isCartOpen: false, cartNotice: 'Hotel items were removed.', dismissCartNotice }}>
        <CartFAB />
      </CartContext.Provider>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Hotel items were removed.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss cart notice' }));
    expect(dismissCartNotice).toHaveBeenCalledOnce();
  });
});