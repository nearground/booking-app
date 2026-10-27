import React from 'react';

const SessionSummary = ({
  isSessionFull,
  remainingSpots,
  totalPrice,
  totalSelectedTickets,
  availableSpots,
  onAddToCart,
  waitlistJoined,
  onJoinWaitlist,
  isAddingToCart,
}) => {
  if (isSessionFull) {
    return (
      <div className="md:col-span-1 border border-slate-200 rounded-lg p-4 h-fit">
        <p className="text-sm text-slate-600">Session status</p>
        <p className="text-2xl font-semibold text-slate-800 mt-1">Full</p>
        <button
          type="button"
          onClick={onJoinWaitlist}
          disabled={waitlistJoined}
          data-testid="session-summary__join-waitlist"
          className="mt-4 w-full px-4 py-2.5 rounded-md bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {waitlistJoined ? 'Added to Waitlist' : 'Join Waitlist'}
        </button>
        {waitlistJoined ? (
          <p className="text-xs text-slate-600 mt-2">
            Placeholder action: you are on the waitlist for this session.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="md:col-span-1 border border-slate-200 rounded-lg p-4 h-fit">
      <p className="text-sm text-slate-600" data-testid="session-summary__spots">{remainingSpots} spots remaining</p>
      <p className="text-sm text-slate-600">Total</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1" data-testid="session-summary__total">${totalPrice.toFixed(2)}</p>
      <button
        type="button"
        disabled={totalSelectedTickets === 0 || totalSelectedTickets > availableSpots || isAddingToCart}
        onClick={onAddToCart}
        data-testid="session-summary__add-to-cart"
        className="mt-4 w-full px-4 py-2.5 rounded-md bg-slate-800 text-white font-medium hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isAddingToCart ? 'Adding...' : 'Add To Cart'}
      </button>
    </div>
  );
};

export default SessionSummary;
