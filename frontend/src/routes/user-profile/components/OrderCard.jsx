import React from 'react';
import { useNavigate } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';
import OrderItemCard from './OrderItemCard';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-600',
  draft: 'bg-slate-100 text-slate-600',
};

const formatPaymentMethod = (paymentMethod) => {
  if (!paymentMethod) return null;
  if (typeof paymentMethod === 'string') return paymentMethod;
  if (paymentMethod.cardType || paymentMethod.last4) {
    const type = paymentMethod.cardType || 'Card';
    const last4 = paymentMethod.last4 ? `•••• ${paymentMethod.last4}` : '';
    return `${type}${last4 ? ` ${last4}` : ''}`.trim();
  }
  if (paymentMethod.name) return paymentMethod.name;
  return JSON.stringify(paymentMethod);
};

const formatMeetingAddress = (meetingAddress) => {
  if (!meetingAddress) return null;
  if (typeof meetingAddress === 'string') return meetingAddress;
  if (Array.isArray(meetingAddress)) return meetingAddress.filter(Boolean).join(', ');
  if (typeof meetingAddress === 'object') {
    return Object.values(meetingAddress).filter(Boolean).join(', ');
  }
  return String(meetingAddress);
};

const formatQuestionAnswers = (questionAnswers) => {
  if (!questionAnswers) return [];
  if (Array.isArray(questionAnswers)) return questionAnswers;
  return Object.entries(questionAnswers).map(([key, value]) => ({ label: key, value }));
};

/**
 * Renders a single order card with its items collapsed/expandable and a
 * "View Confirmation" button that navigates to the booking confirmation page.
 */
const OrderCard = ({ order, defaultExpanded = false }) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [isLoadingConfirmation, setIsLoadingConfirmation] = React.useState(false);
  const navigate = useNavigate();
  const statusStyle = STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600';
  const items = Array.isArray(order.Items) ? order.Items : [];
  const paymentMethodLabel = formatPaymentMethod(order.paymentMethod || order.payment);
  const meetingAddressLabel = formatMeetingAddress(order.meetingAddress || order.meeting_location || order.location);
  const contactInfo = order.contactInfo || order.customerContact || {};
  const questionAnswerEntries = formatQuestionAnswers(order.questionAnswers || order.reservationQuestionAnswers || []);

  const handleViewConfirmation = async () => {
    setIsLoadingConfirmation(true);
    try {
      const response = await networkAdapter.get(`/api/orders/${order.orderNumber}/confirmation`);
      if (response?.data) {
        navigate('/booking-confirmation', { state: { confirmationData: response.data } });
      }
    } finally {
      setIsLoadingConfirmation(false);
    }
  };

  return (
    <li className="bg-white" data-testid="order-card">
      <div className="px-4 py-4 sm:px-6">
        {/* Order header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-brand">{order.orderNumber || 'Order'}</p>
            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyle}`}>
              {(order.status || 'Unknown').charAt(0).toUpperCase() + (order.status || 'Unknown').slice(1)}
            </span>
            <button
              type="button"
              onClick={handleViewConfirmation}
              disabled={isLoadingConfirmation}
              className="text-xs text-indigo-600 hover:text-indigo-800 focus:outline-none disabled:opacity-50"
            >
              {isLoadingConfirmation ? 'Loading…' : 'View Confirmation'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs text-indigo-600 hover:text-indigo-800 focus:outline-none"
            aria-expanded={expanded}
          >
            {expanded ? 'Hide items' : `Show ${items.length} item${items.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Order meta row */}
        <div className="mt-2 grid gap-3 sm:grid-cols-2 text-sm text-slate-500">
          <span>
            Purchased:{' '}
            <span className="text-slate-700">{formatDate(order.createdAt)}</span>
          </span>
          <span>
            Total:{' '}
            <span className="font-semibold text-slate-800">
              ${Number(order.totalAmount || 0).toFixed(2)}{' '}
              <span className="font-normal text-slate-500">{order.currency || 'USD'}</span>
            </span>
          </span>
          {paymentMethodLabel && (
            <span>
              Payment:{' '}
              <span className="font-semibold text-slate-800">{paymentMethodLabel}</span>
            </span>
          )}
        </div>

        {expanded && (
          <div className="mt-3 space-y-4">
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <OrderItemCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                No order items to display.
              </div>
            )}

            {(paymentMethodLabel || contactInfo?.fullName || meetingAddressLabel || questionAnswerEntries.length > 0) && (
              <div className="space-y-4 rounded-lg bg-slate-50 p-4">
                {paymentMethodLabel && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Payment method</h4>
                    <p className="text-sm text-slate-700">{paymentMethodLabel}</p>
                  </div>
                )}

                {(contactInfo?.fullName || contactInfo?.email || contactInfo?.phone) && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Day-of contact</h4>
                    <p className="text-sm text-slate-700">{contactInfo.fullName || 'Contact name not provided'}</p>
                    {contactInfo.email && <p className="text-sm text-slate-500">Email: {contactInfo.email}</p>}
                    {contactInfo.phone && <p className="text-sm text-slate-500">Phone: {contactInfo.phone}</p>}
                  </div>
                )}

                {meetingAddressLabel && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Meeting address</h4>
                    <p className="text-sm text-slate-700 break-words">{meetingAddressLabel}</p>
                  </div>
                )}

                {questionAnswerEntries.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Question answers</h4>
                    <div className="space-y-2">
                      {questionAnswerEntries.map((answer, index) => (
                        <div key={`${answer.label}-${index}`} className="text-sm text-slate-700">
                          <span className="font-semibold">{answer.label}:</span>{' '}
                          <span>{answer.value || 'No answer provided'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

export default OrderCard;
