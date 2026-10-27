import React from 'react';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const CartItemCard = ({ item, onRemove, onChange, isRemoving }) => {
  const meta = item.metadata || {};
  const thumbnail = meta.experienceThumbnail || '';
  const title = meta.experienceTitle || item.description || 'Item';
  const sessionDateTime = meta.sessionDateTime;
  const durationMinutes = Number(meta.experienceDurationMinutes || 0);

  const startDate = sessionDateTime ? new Date(sessionDateTime) : null;
  const endDate = startDate && durationMinutes
    ? new Date(startDate.getTime() + durationMinutes * 60000)
    : null;

  const ticketSelections = Array.isArray(meta.ticketSelections) ? meta.ticketSelections : [];
  const totalPrice = Number(item.totalPrice || 0);

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:gap-4 sm:p-4" data-testid="cart-item-card">
      {/* Thumbnail */}
      {thumbnail ? (
        <div className="h-20 w-20 flex-shrink-0 sm:h-24 sm:w-24 rounded-md overflow-hidden bg-slate-100">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex-shrink-0 w-24 h-24 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
          No image
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-slate-800 truncate" data-testid="cart-item-card__title">{title}</h4>

        {startDate && (
          <p className="text-sm text-slate-600 mt-1">
            {formatDate(sessionDateTime)}
            {' · '}
            {formatTime(sessionDateTime)}
            {endDate ? ` – ${formatTime(endDate)}` : ''}
          </p>
        )}

        {ticketSelections.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {ticketSelections.map((ts, idx) => (
              <p key={idx} className="text-sm text-slate-500">
                {ts.quantity}× {ts.title || `Tier ${idx + 1}`}
                {ts.unitPrice != null ? ` ($${Number(ts.unitPrice).toFixed(2)} each)` : ''}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Price & Actions */}
      <div className="flex min-w-0 flex-row items-center justify-between gap-3 sm:flex-shrink-0 sm:flex-col sm:items-end sm:justify-between">
        <p className="text-lg font-bold text-slate-800" data-testid="cart-item-card__price">${totalPrice.toFixed(2)}</p>
        <div className="flex flex-col items-end gap-2 mt-2">
          <button
            type="button"
            onClick={() => onChange?.(item)}
            data-testid="cart-item-card__change"
            className="touch-target rounded px-2 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            data-testid="cart-item-card__remove"
            className="touch-target rounded px-2 py-2 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {isRemoving ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItemCard;
