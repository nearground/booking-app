import React from 'react';

const OptionalAttendeeEmails = ({ totalTickets, emails, tierLabels = [], onChange }) => {
  if (totalTickets <= 1) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">
        Attendee Emails <span className="text-xs font-normal text-slate-400">(optional — for email communications)</span>
      </p>
      {Array.from({ length: totalTickets - 1 }, (_, index) => (
        <div key={index}>
          <label className="block text-xs text-slate-600 mb-1">
            Attendee {index + 2}
            {tierLabels[index] ? ` — ${tierLabels[index]}` : ''}
          </label>
          <input
            type="email"
            value={emails[index] || ''}
            onChange={(event) => onChange(index, event.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="email@example.com"
          />
        </div>
      ))}
    </div>
  );
};

export default OptionalAttendeeEmails;
