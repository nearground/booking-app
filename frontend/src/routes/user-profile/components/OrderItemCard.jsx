import React from 'react';
import { Link } from 'react-router-dom';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/**
 * Resolves the confirmation code for an order item from the metadata snapshot
 * or from the associated reservation included by the API.
 */
const resolveConfirmationCode = (item) => {
  if (item.metadata?.confirmationCode) return item.metadata.confirmationCode;
  if (item.ExperienceReservation?.confirmationCode) return item.ExperienceReservation.confirmationCode;
  if (item.ServiceReservation?.confirmationCode) return item.ServiceReservation.confirmationCode;
  if (item.HotelReservation?.confirmationCode) return item.HotelReservation.confirmationCode;
  return null;
};

/**
 * Renders a single order item with thumbnail, title (linked to experience page
 * when experienceCode is available), date/time, ticket selections, and
 * confirmation code.
 */
const OrderItemCard = ({ item }) => {
  const meta = item.metadata || {};
  const thumbnail = meta.experienceThumbnail || '';
  const title = meta.experienceTitle || item.description || 'Item';
  const sessionDateTime = meta.sessionDateTime || meta.dateTime;
  const durationMinutes = Number(meta.experienceDurationMinutes || 0);

  const startDate = sessionDateTime ? new Date(sessionDateTime) : null;
  const endDate = startDate && durationMinutes
    ? new Date(startDate.getTime() + durationMinutes * 60000)
    : null;

  const ticketSelections = Array.isArray(meta.ticketSelections) ? meta.ticketSelections : [];
  const totalPrice = Number(item.totalPrice || 0);
  const confirmationCode = resolveConfirmationCode(item);
  const organizationEmail = item.ExperienceReservation?.ScheduledExperience?.Experience?.Organization?.email || meta.organizationEmail || null;

  return (
    <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="order-item-card">
      {thumbnail ? (
        <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-slate-100">
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="flex-shrink-0 w-20 h-20 rounded-md bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
          No image
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-semibold text-slate-800 truncate">
          {meta.experienceCode ? (
            <Link
              to={`/experience/${meta.experienceCode}`}
              className="hover:underline hover:text-brand"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h5>

        {startDate && (
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(sessionDateTime)}
            {' · '}
            {formatTime(sessionDateTime)}
            {endDate ? ` – ${formatTime(endDate)}` : ''}
          </p>
        )}

        {ticketSelections.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {ticketSelections.map((ts, idx) => (
              <p key={idx} className="text-xs text-slate-500">
                {ts.quantity}× {ts.title || `Tier ${idx + 1}`}
                {ts.unitPrice != null ? ` ($${Number(ts.unitPrice).toFixed(2)} each)` : ''}
              </p>
            ))}
          </div>
        )}

        {confirmationCode && (
          <p className="mt-1 text-xs text-slate-500">
            Confirmation: <span className="font-mono font-medium text-slate-700">{confirmationCode}</span>
          </p>
        )}

        {organizationEmail && (
          <p className="mt-1 text-xs text-slate-500">
            Contact: <span className="font-mono font-medium text-slate-700">{organizationEmail}</span>
          </p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-bold text-slate-800">${totalPrice.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default OrderItemCard;
