import React from 'react';

const OrganizerCard = React.memo(({ organizer, onSelect, compact = false }) => {
  const fullName = organizer.name
    || `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim()
    || 'Organizer';
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join('');

  return (
    <button
      type="button"
      className={compact
        ? 'flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
        : 'border border-slate-200 rounded-xl px-3 py-4 flex flex-col items-center text-center hover:bg-slate-50'}
      onClick={() => onSelect(organizer)}
      aria-label={compact ? `Read ${fullName}'s bio and organizer comments` : undefined}
    >
      {organizer.profilePicture ? (
        <img
          src={organizer.profilePicture}
          alt={fullName}
          className={compact ? 'h-12 w-12 shrink-0 rounded-full object-cover' : 'w-16 h-16 rounded-full object-cover'}
        />
      ) : (
        <span className={`${compact ? 'h-12 w-12 shrink-0' : 'w-16 h-16'} rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold`}>
          {initials || 'O'}
        </span>
      )}
      <span className={compact ? 'min-w-0' : 'mt-3'}>
        <span className="block text-sm font-semibold text-slate-700">{fullName}</span>
        {compact && (
          <>
            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">
              {organizer.description || 'Meet your local host.'}
            </span>
            <span className="mt-1 block text-xs font-semibold text-slate-700">Bio &amp; guest comments</span>
          </>
        )}
      </span>
    </button>
  );
});

export default OrganizerCard;
