import React, { useContext } from 'react';
import { CartContext } from 'contexts/CartContext';

const CartFAB = () => {
  const { cartCount, isCartOpen, openCart } = useContext(CartContext);

  if (cartCount === 0 || isCartOpen) return null;

  return (
    <button
      type="button"
      onClick={openCart}
      data-testid="cart-fab"
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-[9999] pointer-events-auto flex items-center gap-4 rounded-full bg-emerald-600 min-h-11 max-w-[calc(100vw-2rem)] px-4 py-3 shadow-lg transition hover:bg-emerald-700"
      aria-label={`Open cart with ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
    >
      <span className="relative inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-emerald-800" data-testid="cart-fab__badge">
          {cartCount > 9 ? '9+' : cartCount}
        </span>
      </span>

      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        Checkout
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l7-7m0 0H7m7 0v7" />
        </svg>
      </span>
    </button>
  );
};

export default CartFAB;
