import React from 'react';
import { buildCronExpression, WEEKDAY_OPTIONS } from 'utils/schedule-builder';

const fieldClassName = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const labelClassName = 'mb-1 block text-sm font-medium text-slate-700';

const TemplateEditor = ({ value = {}, onChange, timezone, idPrefix }) => {
  const setField = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  const setRecurringFields = (fields) => {
    const next = {
      ...value,
      ...fields,
      ruleType: 'cron',
      ruleDateTime: null,
    };
    if (!next._useCustomCron) {
      next.ruleCron = buildCronExpression({
        recurrenceType: next._recurrenceType || 'weekly',
        time: next._time,
        weekDays: next._weekDays || [],
      });
    }
    onChange(next);
  };

  const setScheduleType = (ruleType) => {
    if (ruleType === 'datetime') {
      onChange({ ...value, ruleType, ruleCron: null });
      return;
    }
    const next = {
      ...value,
      ruleType: 'cron',
      ruleDateTime: null,
      _recurrenceType: value._recurrenceType || 'weekly',
      _weekDays: value._weekDays || [],
      _useCustomCron: false,
    };
    next.ruleCron = buildCronExpression({
      recurrenceType: next._recurrenceType,
      time: next._time,
      weekDays: next._weekDays,
    });
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor={`${idPrefix}-name`}>Schedule name <span className="font-normal text-slate-400">optional</span></label>
          <input
            id={`${idPrefix}-name`}
            className={fieldClassName}
            placeholder="e.g. Weekend morning tour"
            value={value.name || ''}
            onChange={(event) => setField('name', event.target.value)}
          />
        </div>
        <div>
          <span className={labelClassName}>This schedule</span>
          <div className="inline-flex w-full rounded-md border border-slate-300 bg-slate-50 p-1" role="group" aria-label="Schedule pattern">
            <button
              type="button"
              aria-pressed={(value.ruleType || 'cron') === 'cron'}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${(value.ruleType || 'cron') === 'cron' ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setScheduleType('cron')}
            >
              Repeats
            </button>
            <button
              type="button"
              aria-pressed={value.ruleType === 'datetime'}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${value.ruleType === 'datetime' ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setScheduleType('datetime')}
            >
              Happens once
            </button>
          </div>
        </div>
      </div>

      {value.ruleType === 'datetime' ? (
        <div className="max-w-md">
          <label className={labelClassName} htmlFor={`${idPrefix}-once`}>Date and start time</label>
          <input
            id={`${idPrefix}-once`}
            className={fieldClassName}
            type="datetime-local"
            value={value.ruleDateTime || ''}
            onChange={(event) => setField('ruleDateTime', event.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-4 rounded-md bg-slate-50 p-4">
          <div>
            <span className={labelClassName}>How often?</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Repeat frequency">
              {[
                { value: 'weekly', label: 'On selected days' },
                { value: 'daily', label: 'Every day' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={(value._recurrenceType || 'weekly') === option.value}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${(value._recurrenceType || 'weekly') === option.value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
                  onClick={() => setRecurringFields({ _recurrenceType: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor={`${idPrefix}-time`}>Start time</label>
              <input
                id={`${idPrefix}-time`}
                className={fieldClassName}
                type="time"
                value={value._time || ''}
                onChange={(event) => setRecurringFields({ _time: event.target.value })}
              />
            </div>
            <div className="flex items-end pb-2 text-sm text-slate-500">
              All times use the experience location's time zone
              {timezone ? ` (${timezone})` : ''}.
            </div>
          </div>

          {(value._recurrenceType || 'weekly') === 'weekly' && (
            <fieldset>
              <legend className={labelClassName}>Which days?</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = (value._weekDays || []).includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={selected}
                      className={`rounded-md border px-2 py-2 text-sm font-medium transition-colors ${selected ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
                      onClick={() => {
                        const nextDays = new Set(value._weekDays || []);
                        if (nextDays.has(day.value)) nextDays.delete(day.value);
                        else nextDays.add(day.value);
                        setRecurringFields({ _weekDays: Array.from(nextDays).sort((a, b) => a - b) });
                      }}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {(value._weekDays || []).length === 0 && (
                <p className="mt-2 text-xs text-amber-700">Select at least one day to finish this schedule.</p>
              )}
            </fieldset>
          )}

          <div>
            <p className={labelClassName}>Date range <span className="font-normal text-slate-400">optional</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-600" htmlFor={`${idPrefix}-start-date`}>Starts on</label>
                <input
                  id={`${idPrefix}-start-date`}
                  className={fieldClassName}
                  type="date"
                  value={value.startDate ? value.startDate.slice(0, 10) : ''}
                  onChange={(event) => setField('startDate', event.target.value || null)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600" htmlFor={`${idPrefix}-end-date`}>Ends on</label>
                <input
                  id={`${idPrefix}-end-date`}
                  className={fieldClassName}
                  type="date"
                  value={value.endDate ? value.endDate.slice(0, 10) : ''}
                  onChange={(event) => setField('endDate', event.target.value || null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <details className="rounded-md border border-slate-200 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Session details and advanced options</summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor={`${idPrefix}-duration`}>Session duration <span className="font-normal text-slate-400">optional, minutes</span></label>
              <input
                id={`${idPrefix}-duration`}
                className={fieldClassName}
                placeholder="Use experience duration"
                type="number"
                min="1"
                value={value.durationMinutes ?? ''}
                onChange={(event) => setField('durationMinutes', event.target.value ? Number(event.target.value) : null)}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor={`${idPrefix}-capacity`}>Session capacity <span className="font-normal text-slate-400">optional</span></label>
              <input
                id={`${idPrefix}-capacity`}
                className={fieldClassName}
                placeholder="Use experience capacity"
                type="number"
                min="1"
                value={value.capacity ?? ''}
                onChange={(event) => setField('capacity', event.target.value ? Number(event.target.value) : null)}
              />
            </div>
          </div>
          {value.ruleType !== 'datetime' && (
            <div>
              <label className={labelClassName} htmlFor={`${idPrefix}-custom-toggle`}>
                <input
                  id={`${idPrefix}-custom-toggle`}
                  className="mr-2 align-middle"
                  type="checkbox"
                  checked={Boolean(value._useCustomCron)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange({ ...value, _useCustomCron: true });
                    } else {
                      const next = { ...value, _useCustomCron: false };
                      next.ruleCron = buildCronExpression({
                        recurrenceType: next._recurrenceType || 'weekly',
                        time: next._time,
                        weekDays: next._weekDays || [],
                      });
                      onChange(next);
                    }
                  }}
                />
                Enter a custom cron expression
              </label>
              {value._useCustomCron && (
                <>
                  <input
                    id={`${idPrefix}-custom-cron`}
                    className={fieldClassName}
                    placeholder="e.g. 0 18 * * 5"
                    value={value.ruleCron || ''}
                    onChange={(event) => setField('ruleCron', event.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Advanced option for custom recurrence rules. Use five cron fields.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
};

export default TemplateEditor;
