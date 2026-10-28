import React from 'react';
import { formatDateTimeForInput, parseDateTimeInput } from 'utils/schedule-builder';

const fieldClassName = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const labelClassName = 'mb-1 block text-sm font-medium text-slate-700';

const PickedEditor = ({ value = {}, onChange, idPrefix, timezone }) => {
  const setField = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Add a one-off session. Times are entered in the experience location's time zone
        {timezone ? ` (${timezone})` : ''}. You can set a different end time, capacity, or organizer note.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor={`${idPrefix}-start`}>Date and start time</label>
          <input
            id={`${idPrefix}-start`}
            className={fieldClassName}
            type="datetime-local"
            value={formatDateTimeForInput(value.dateTime, timezone)}
            onChange={(event) => setField('dateTime', parseDateTimeInput(event.target.value, timezone))}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor={`${idPrefix}-end`}>End time <span className="font-normal text-slate-400">optional</span></label>
          <input
            id={`${idPrefix}-end`}
            className={fieldClassName}
            type="datetime-local"
            value={formatDateTimeForInput(value.endDateTime, timezone)}
            onChange={(event) => setField('endDateTime', parseDateTimeInput(event.target.value, timezone))}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor={`${idPrefix}-capacity`}>Session capacity <span className="font-normal text-slate-400">optional</span></label>
          <input
            id={`${idPrefix}-capacity`}
            className={fieldClassName}
            type="number"
            min="1"
            placeholder="Use experience capacity"
            value={value.capacity ?? ''}
            onChange={(event) => setField('capacity', event.target.value ? Number(event.target.value) : null)}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor={`${idPrefix}-note`}>Organizer note <span className="font-normal text-slate-400">optional</span></label>
          <input
            id={`${idPrefix}-note`}
            className={fieldClassName}
            placeholder="e.g. Holiday special"
            value={value.note || ''}
            onChange={(event) => setField('note', event.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default PickedEditor;
