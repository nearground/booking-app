import React from 'react';

const WaitlistSection = () => {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      <p className="text-base font-semibold text-slate-800">This session is full.</p>
      <p className="text-sm text-slate-600 mt-1">
        Join the waitlist and we will notify you if spots become available.
      </p>
    </div>
  );
};

export default WaitlistSection;
