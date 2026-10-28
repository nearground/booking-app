import React from 'react';
import TemplateEditor from './TemplateEditor';
import PickedEditor from './PickedEditor';

const ScheduleBuilder = ({ schedules = [], onChange, timezone }) => {
  const updateItem = (index, next) => {
    const copy = [...schedules];
    copy[index] = next;
    onChange(copy);
  };

  const removeItem = (index) => {
    const copy = schedules.filter((_, i) => i !== index);
    onChange(copy);
  };

  const addTemplate = () => {
    onChange([
      ...schedules,
      {
        kind: 'template',
        name: '',
        ruleType: 'cron',
        ruleCron: null,
        ruleDateTime: null,
        durationMinutes: '',
        capacity: '',
        _recurrenceType: 'weekly',
        _time: '',
        _weekDays: [],
        _useCustomCron: false,
        startDate: '',
        endDate: '',
      },
    ]);
  };

  const addPicked = () => {
    onChange([...schedules, { kind: 'picked', dateTime: '', endDateTime: '', capacity: '', note: '' }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-800">How will this experience run?</p>
          <p className="mt-1 text-sm text-slate-500">
            Set a repeating timetable, add specific dates, or combine both.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-95"
            onClick={addTemplate}
          >
            + Add repeating schedule
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            onClick={addPicked}
          >
            + Add specific date
          </button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          <p className="font-medium text-slate-700">No sessions added yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Choose a repeating schedule for regular sessions, or add dates one by one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((item, idx) => (
            <section
              key={idx}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              aria-labelledby={`schedule-title-${idx}`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                    {item.kind === 'template' ? 'Repeating schedule' : 'Specific date'}
                  </p>
                  <h4 id={`schedule-title-${idx}`} className="mt-0.5 font-semibold text-slate-800">
                    {item.name || (item.kind === 'template' ? `Schedule ${idx + 1}` : `Date ${idx + 1}`)}
                  </h4>
                </div>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                  onClick={() => removeItem(idx)}
                  aria-label={`Remove ${item.kind === 'template' ? 'schedule' : 'date'} ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
              <div className="p-4">
                {item.kind === 'template' ? (
                  <TemplateEditor
                    value={item}
                    onChange={(next) => updateItem(idx, next)}
                    timezone={timezone}
                    idPrefix={`schedule-${idx}`}
                  />
                ) : (
                  <PickedEditor value={item} onChange={(next) => updateItem(idx, next)} idPrefix={`date-${idx}`} />
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleBuilder;
