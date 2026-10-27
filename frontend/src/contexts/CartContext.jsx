import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import { AuthContext } from 'contexts/AuthContext';

export const CartContext = createContext({
  cart: null,
  cartItems: [],
  cartCount: 0,
  isCartOpen: false,
  isLoading: false,
  addToCart: async () => {},
  removeFromCart: async () => {},
  updateCartItem: async () => {},
  clearCart: async () => {},
  openCart: () => {},
  closeCart: () => {},
  refreshCart: async () => {},
});

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const refreshRequestRef = useRef(0);
  const { isAuthenticated } = useContext(AuthContext);

  const cartItems = cart?.Items || [];
  const cartCount = cartItems.length;

  const refreshCart = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    setIsLoading(true);
    try {
      const response = await networkAdapter.get('/api/cart/');
      if (requestId !== refreshRequestRef.current) return;
      if (response?.data?.cart) {
        setCart(response.data.cart);
      } else {
        setCart(null);
      }
    } catch {
      // Keep the last known cart when a refresh fails.
    } finally {
      if (requestId === refreshRequestRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart, isAuthenticated]);

  const addToCart = useCallback(async (itemPayload) => {
    const response = await networkAdapter.post('/api/cart/items', itemPayload);
    if (response?.errors?.length > 0) {
      throw new Error(response.errors[0]);
    }
    await refreshCart();
    return response.data;
  }, [refreshCart]);

  const removeFromCart = useCallback(async (itemId) => {
    const response = await networkAdapter.delete(`/api/cart/items/${itemId}`);
    if (!response?.ok || response?.errors?.length > 0) {
      const message = Array.isArray(response?.errors) && response.errors.length > 0
        ? response.errors[0]
        : 'Failed to remove item from cart';
      throw new Error(message);
    }

    setCart((prevCart) => {
      if (!prevCart || !Array.isArray(prevCart.Items)) return prevCart;
      const remainingItems = prevCart.Items.filter((item) => item.id !== itemId);
      const remainingTotal = remainingItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
      return {
        ...prevCart,
        Items: remainingItems,
        totalAmount: Number(remainingTotal.toFixed(2)),
      };
    });

    await refreshCart();
  }, [refreshCart]);

  const updateCartItem = useCallback(async (itemId, updates) => {
    const response = await networkAdapter.patch(`/api/cart/items/${itemId}`, updates);
    if (response?.errors?.length > 0) {
      throw new Error(response.errors[0]);
    }
    await refreshCart();
  }, [refreshCart]);

  const clearCartItems = useCallback(async () => {
    await networkAdapter.delete('/api/cart/');
    await refreshCart();
  }, [refreshCart]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        cartCount,
        isCartOpen,
        isLoading,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart: clearCartItems,
        openCart,
        closeCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};