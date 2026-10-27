import React from 'react';

const MainContactForm = ({ mainContact, onChange, errors }) => {
  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3" data-testid="contact-form">
      <p className="text-sm font-semibold text-slate-800">Day-of Contact</p>
      <div>
        <label className="block text-sm text-slate-700 mb-1">
          Phone Number (day-of contact) <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={mainContact.phone}
          onChange={(event) => onChange('phone', event.target.value)}
          data-testid="contact-form__phone"
          className={`w-full border ${errors?.phone ? 'border-red-400' : 'border-slate-300'} rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400`}
          placeholder="+1 (555) 123-4567"
        />
        {errors?.phone ? (
          <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm text-slate-700 mb-1">
          Hotel Name <span className="text-xs text-slate-400">(optional)</span>
        </label>
        <input
          type="text"
          value={mainContact.hotelName}
          onChange={(event) => onChange('hotelName', event.target.value)}
          data-testid="contact-form__hotel"
          className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="Where are you staying?"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-700 mb-1">
          Comments <span className="text-xs text-slate-400">(optional)</span>
        </label>
        <textarea
          value={mainContact.comments}
          onChange={(event) => onChange('comments', event.target.value)}
          rows={2}
          data-testid="contact-form__comments"
          className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
          placeholder="Any special requests or notes"
        />
      </div>
    </div>
  );
};

export default MainContactForm;
