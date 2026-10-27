import React from 'react';

const TicketTierSelector = ({ tier, quantity, canDecrement, canIncrement, onDecrement, onIncrement }) => {
  return (
    <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between" data-testid="tier-selector">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrement}
            disabled={!canDecrement}
            className="h-8 w-8 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`Decrease ${tier.title} quantity`}
          >
            -
          </button>
          <span className="min-w-6 text-center text-sm font-semibold text-slate-800" data-testid="tier-selector__quantity">
            {quantity}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            disabled={!canIncrement}
            className="h-8 w-8 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`Increase ${tier.title} quantity`}
          >
            +
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {tier.title}
            {tier.ageLabel ? (
              <span className="text-xs font-medium text-slate-500 ml-2">{tier.ageLabel}</span>
            ) : null}
          </p>
          {tier.description ? (
            <p className="text-xs text-slate-500 mt-0.5">{tier.description}</p>
          ) : null}
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-800" data-testid="tier-selector__price">${tier.price.toFixed(2)}</p>
    </div>
  );
};

export default TicketTierSelector;
