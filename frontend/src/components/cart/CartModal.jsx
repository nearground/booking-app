import React, { useContext, useEffect, useRef, useState } from 'react';
import useModalAccessibility from 'components/ux/modal/useModalAccessibility';
import { useNavigate } from 'react-router-dom';
import { CartContext } from 'contexts/CartContext';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import CartItemCard from './CartItemCard';

const CartModal = () => {
  const {
    cart,
    cartItems,
    isCartOpen,
    isLoading,
    cartNotice,
    dismissCartNotice,
    closeCart,
    removeFromCart,
    refreshCart,
  } = useContext(CartContext);

  const navigate = useNavigate();
  const { isAuthenticated, userDetails } = useContext(AuthContext);

  const [removingId, setRemovingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const dialogRef = useRef(null);
  useModalAccessibility({ isOpen: isCartOpen, onClose: closeCart, dialogRef });
  useEffect(() => {
    if (!isCartOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    if (previousOverflow === 'hidden') return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isCartOpen]);

  // Contact info (collected at checkout, not in booking modal)
  const [contact, setContact] = useState({ fullName: '', phone: '', email: '' });
  const [contactErrors, setContactErrors] = useState({});
  const [saveBookingForLater, setSaveBookingForLater] = useState(true);
  const hasPublicAttendanceOptIn = cartItems.some((item) =>
    item.ProductType === 'Experience' &&
    Array.isArray(item.metadata?.reservationAnswers) &&
    item.metadata.reservationAnswers.some((answer) =>
      answer?.questionKey === 'publicAttendance' && answer.answerText === 'true'
    )
  );

  useEffect(() => {
    if (hasPublicAttendanceOptIn) setSaveBookingForLater(true);
  }, [hasPublicAttendanceOptIn]);

  useEffect(() => {
    if (!isAuthenticated || !userDetails) return;

    const defaultFullName =
      userDetails.fullName ||
      [userDetails.firstName, userDetails.lastName].filter(Boolean).join(' ').trim();

    setContact((prevContact) => ({
      fullName: prevContact.fullName || defaultFullName,
      phone: prevContact.phone || userDetails.phoneNumber || '',
      email: prevContact.email || userDetails.email || '',
    }));
  }, [isAuthenticated, userDetails]);

  // Billing
  const [billing, setBilling] = useState({
    address: process.env.NODE_ENV === 'development' ? '111 Test St' : '',
    city: process.env.NODE_ENV === 'development' ? 'Test City' : '',
    state: process.env.NODE_ENV === 'development' ? 'XX' : '',
    postalCode: process.env.NODE_ENV === 'development' ? '11111' : '',
  });

  if (!isCartOpen) return null;

  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

  const handleRemove = async (itemId) => {
    setRemovingId(itemId);
    try {
      await removeFromCart(itemId);
    } catch (error) {
      setSubmitError(error?.message || 'Failed to remove item from cart');
    } finally {
      setRemovingId(null);
    }
  };

  const handleChange = (item) => {
    const routeTarget = item.metadata?.experienceCode || item.ProductId;
    if (!routeTarget) {
      return;
    }

    closeCart();
    navigate(`/experience/${routeTarget}`, { state: { cartEdit: item } });
  };

  const handleContactChange = (field, value) => {
    setContact((prev) => ({ ...prev, [field]: value }));
    if (contactErrors[field]) setContactErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleBillingChange = (field, value) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    let valid = true;
    const cErrors = {};

    if (!contact.fullName.trim()) { cErrors.fullName = 'Required'; valid = false; }
    if (!contact.phone.trim()) { cErrors.phone = 'Required'; valid = false; }
    if (!contact.email.trim()) {
      cErrors.email = 'Required';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      cErrors.email = 'Invalid email';
      valid = false;
    }

    setContactErrors(cErrors);
    return valid;
  };

  const buildBookingDetails = (orderData) => {
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const firstItem = items[0] || {};
    const totalAttendees = items.reduce((sum, item) => {
      const value = item.metadata?.numberOfAttendees ?? item.quantity;
      return sum + Number(value || 0);
    }, 0);

    const ticketDetails = items.flatMap((item) => {
      const details = [];
      if (item.metadata?.ticketSelections && Array.isArray(item.metadata.ticketSelections)) {
        item.metadata.ticketSelections.forEach((ticket) => {
          details.push({
            label: `${ticket.title || 'Ticket'} (${ticket.quantity || 1} x $${Number(ticket.unitPrice || 0).toFixed(2)})`,
            value: `$${Number(ticket.amount || ticket.unitPrice || 0).toFixed(2)}`,
          });
        });
      }
      return details;
    });

    return [
      { label: 'Reservation Code', value: orderData.orderNumber || '' },
      { label: 'Experience Name', value: firstItem.metadata?.experienceTitle || firstItem.description || 'Booking' },
      { label: 'Status', value: orderData.status || '' },
      { label: 'Booking Date', value: new Date().toLocaleString() },
      { label: 'Number of Attendees', value: String(totalAttendees || items.length || 1) },
      { label: 'Total Price', value: `$${Number(orderData.totalAmount || 0).toFixed(2)}` },
      ...ticketDetails,
    ];
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await networkAdapter.post('/api/cart/checkout', {
        cartId: cart?.id,
        ...(!isAuthenticated ? { saveBookingForLater } : {}),
        billingInfo: {
          email: contact.email.trim(),
          name: contact.fullName.trim(),
          address: billing.address.trim(),
          city: billing.city.trim(),
          state: billing.state.trim(),
          postalCode: billing.postalCode.trim(),
        },
        contact: {
          fullName: contact.fullName.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
        },
        billing: {
          address: billing.address.trim(),
          city: billing.city.trim(),
          state: billing.state.trim(),
          postalCode: billing.postalCode.trim(),
        },
      });

      if (response?.errors?.length > 0) {
        setSubmitError(response.errors[0]);
        setIsSubmitting(false);
        return;
      }

      const confirmationData = {
        ...response.data,
        bookingDetails: buildBookingDetails(response.data),
      };

      await refreshCart();
      setIsSubmitting(false);
      closeCart();
      navigate('/booking-confirmation', {
        state: { confirmationData },
      });
    } catch {
      setSubmitError('Checkout failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="responsive-overlay fixed inset-0 z-[9998] flex items-center justify-center bg-black/50" onClick={(event) => { if (event.target === event.currentTarget) closeCart(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-modal-title"
        tabIndex={-1}
        className="responsive-dialog bg-slate-50 max-w-3xl rounded-xl shadow-xl border border-slate-200 flex flex-col"
        data-testid="cart-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex flex-wrap gap-2 items-center justify-between px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
          <h2 id="cart-modal-title" className="text-xl font-bold text-slate-800">Your Cart</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeCart}
              className="text-sm font-medium text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-md transition"
            >
              Keep Shopping
            </button>
            <button
              type="button"
              onClick={closeCart}
              className="touch-target rounded-md px-2 text-2xl leading-none text-slate-500 hover:text-slate-700"
              aria-label="Close cart"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="responsive-dialog__body flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {submitSuccess ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✓</div>
              <h3 className="text-lg font-semibold text-green-700">Order Placed!</h3>
              <p className="text-sm text-slate-600 mt-1">Your booking has been confirmed.</p>
              <button
                type="button"
                onClick={() => { setSubmitSuccess(false); closeCart(); }}
                className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 text-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {cartNotice && (
                <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="flex items-start justify-between gap-3">
                    <p>{cartNotice}</p>
                    <button type="button" onClick={dismissCartNotice} className="font-medium underline" aria-label="Dismiss cart notice">Dismiss</button>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              {isLoading ? (
                <p className="text-center text-slate-500 py-8">Loading cart…</p>
              ) : cartItems.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-sm" data-testid="cart-modal__empty">Your cart is empty.</p>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      onRemove={handleRemove}
                      onChange={handleChange}
                      isRemoving={removingId === item.id}
                    />
                  ))}
                </div>
              )}

              {cartItems.length > 0 && (
                <>
                  {/* Contact Info */}
                  <section>
                    <h3 className="text-base font-semibold text-slate-700 mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={contact.fullName}
                          onChange={(e) => handleContactChange('fullName', e.target.value)}
                          data-testid="cart-modal__contact-name"
                          className={`w-full border rounded-md px-3 py-2 text-sm ${contactErrors.fullName ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        {contactErrors.fullName && <p className="text-xs text-red-500 mt-0.5">{contactErrors.fullName}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Phone *</label>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => handleContactChange('phone', e.target.value)}
                          data-testid="cart-modal__contact-phone"
                          className={`w-full border rounded-md px-3 py-2 text-sm ${contactErrors.phone ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        {contactErrors.phone && <p className="text-xs text-red-500 mt-0.5">{contactErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => handleContactChange('email', e.target.value)}
                          data-testid="cart-modal__contact-email"
                          className={`w-full border rounded-md px-3 py-2 text-sm ${contactErrors.email ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        {contactErrors.email && <p className="text-xs text-red-500 mt-0.5">{contactErrors.email}</p>}
                      </div>
                    </div>
                  </section>

                  {/* Billing */}
                  <section>
                    <h3 className="text-base font-semibold text-slate-700 mb-3">Billing Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                        <input
                          type="text"
                          value={billing.address}
                          onChange={(e) => handleBillingChange('address', e.target.value)}
                          data-testid="cart-modal__billing-address"
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                        <input
                          type="text"
                          value={billing.city}
                          onChange={(e) => handleBillingChange('city', e.target.value)}
                          data-testid="cart-modal__billing-city"
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                          <input
                            type="text"
                            value={billing.state}
                            onChange={(e) => handleBillingChange('state', e.target.value)}
                            data-testid="cart-modal__billing-state"
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">ZIP</label>
                          <input
                            type="text"
                            value={billing.postalCode}
                            onChange={(e) => handleBillingChange('postalCode', e.target.value)}
                            data-testid="cart-modal__billing-zip"
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {!isAuthenticated && (
                    <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={saveBookingForLater}
                        onChange={(event) => setSaveBookingForLater(event.target.checked)}
                        data-testid="cart-modal__save-booking"
                        className="mt-1 h-5 w-5 shrink-0"
                      />
                      <span>
                        Save this booking to my email for later registration
                        <span className="mt-1 block text-xs text-slate-500">
                          Create an account after booking or another time. Verify this email to add the booking to your account.
                          If unchecked, you will still receive your receipt, but this booking will not be linked to a future account.
                        </span>
                      </span>
                    </label>
                  )}

                  {/* Error */}
                  {submitError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="cart-modal__error">
                      {submitError}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer with total & checkout */}
        {!submitSuccess && cartItems.length > 0 && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 rounded-b-xl flex flex-wrap gap-2 items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-800" data-testid="cart-modal__total">${cartTotal.toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isSubmitting}
              data-testid="cart-modal__checkout-btn"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm"
            >
              {isSubmitting ? 'Processing…' : 'Complete Checkout'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
