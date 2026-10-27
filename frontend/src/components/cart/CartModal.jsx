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

  // Contact info (collected at checkout, not in booking modal)
  const [contact, setContact] = useState({ fullName: '', phone: '', email: '' });
  const [contactErrors, setContactErrors] = useState({});

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

  // Payment fields
  const [payment, setPayment] = useState({
    nameOnCard: process.env.NODE_ENV === 'development' ? 'John Doe' : '',
    cardNumber: process.env.NODE_ENV === 'development' ? '4508750015741019' : '',
    expiry: process.env.NODE_ENV === 'development' ? '12/99' : '',
    cvc: process.env.NODE_ENV === 'development' ? '123' : '',
  });
  const [paymentErrors, setPaymentErrors] = useState({});

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

  const formatCardNumber = (value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const handlePaymentChange = (field, value) => {
    let nextValue = value;

    if (field === 'cardNumber') {
      nextValue = formatCardNumber(value);
    }
    if (field === 'expiry') {
      nextValue = formatExpiry(value);
    }

    setPayment((prev) => ({ ...prev, [field]: nextValue }));
    if (paymentErrors[field]) setPaymentErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleBillingChange = (field, value) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    let valid = true;
    const cErrors = {};
    const pErrors = {};

    if (!contact.fullName.trim()) { cErrors.fullName = 'Required'; valid = false; }
    if (!contact.phone.trim()) { cErrors.phone = 'Required'; valid = false; }
    if (!contact.email.trim()) {
      cErrors.email = 'Required';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      cErrors.email = 'Invalid email';
      valid = false;
    }

    if (!payment.nameOnCard.trim()) { pErrors.nameOnCard = 'Required'; valid = false; }
    if (!/^\d{13,19}$/.test(payment.cardNumber.replace(/\s/g, ''))) { pErrors.cardNumber = 'Invalid card number'; valid = false; }
    if (!/^\d{2}\/\d{2}$/.test(payment.expiry.trim())) { pErrors.expiry = 'Use MM/YY'; valid = false; }
    if (!/^\d{3,4}$/.test(payment.cvc.trim())) { pErrors.cvc = 'Invalid CVC'; valid = false; }

    setContactErrors(cErrors);
    setPaymentErrors(pErrors);
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
    if (!isAuthenticated) {
      setSubmitError('Please log in to complete checkout.');
      return;
    }
    if (cartItems.length === 0) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await networkAdapter.post('/api/cart/checkout', {
        cartId: cart?.id,
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
        payment: {
          nameOnCard: payment.nameOnCard.trim(),
          cardNumber: payment.cardNumber.replace(/\s/g, ''),
          expiry: payment.expiry.trim(),
          cvc: payment.cvc.trim(),
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
        className="bg-slate-50 w-full max-w-3xl max-h-[90vh] rounded-xl shadow-xl border border-slate-200 flex flex-col"
        data-testid="cart-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-xl">
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

                  {/* Payment */}
                  <section>
                    <h3 className="text-base font-semibold text-slate-700 mb-3">Payment Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Name on Card *</label>
                        <input
                          type="text"
                          value={payment.nameOnCard}
                          onChange={(e) => handlePaymentChange('nameOnCard', e.target.value)}
                          data-testid="cart-modal__payment-name"
                          className={`w-full border rounded-md px-3 py-2 text-sm ${paymentErrors.nameOnCard ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        {paymentErrors.nameOnCard && <p className="text-xs text-red-500 mt-0.5">{paymentErrors.nameOnCard}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Card Number *</label>
                        <input
                          type="text"
                          value={payment.cardNumber}
                          onChange={(e) => handlePaymentChange('cardNumber', e.target.value)}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          data-testid="cart-modal__payment-card"
                          className={`w-full border rounded-md px-3 py-2 text-sm ${paymentErrors.cardNumber ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        {paymentErrors.cardNumber && <p className="text-xs text-red-500 mt-0.5">{paymentErrors.cardNumber}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Expiry *</label>
                          <input
                            type="text"
                            value={payment.expiry}
                            onChange={(e) => handlePaymentChange('expiry', e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            data-testid="cart-modal__payment-expiry"
                            className={`w-full border rounded-md px-3 py-2 text-sm ${paymentErrors.expiry ? 'border-red-400' : 'border-slate-300'}`}
                          />
                          {paymentErrors.expiry && <p className="text-xs text-red-500 mt-0.5">{paymentErrors.expiry}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">CVC *</label>
                          <input
                            type="text"
                            value={payment.cvc}
                            onChange={(e) => handlePaymentChange('cvc', e.target.value)}
                            placeholder="123"
                            maxLength={4}
                            data-testid="cart-modal__payment-cvc"
                            className={`w-full border rounded-md px-3 py-2 text-sm ${paymentErrors.cvc ? 'border-red-400' : 'border-slate-300'}`}
                          />
                          {paymentErrors.cvc && <p className="text-xs text-red-500 mt-0.5">{paymentErrors.cvc}</p>}
                        </div>
                      </div>
                    </div>
                  </section>

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
          <div className="border-t border-slate-200 bg-white px-6 py-4 rounded-b-xl flex items-center justify-between">
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
