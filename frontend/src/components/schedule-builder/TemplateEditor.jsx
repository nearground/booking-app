import React from 'react';
import { WEEKDAY_OPTIONS } from 'utils/schedule-builder';

const TemplateEditor = ({ value = {}, onChange }) => {
  const setField = (field, v) => onChange({ ...value, [field]: v });

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-slate-600 mb-1">Name</label>
        <input className="border rounded px-2 py-1 w-full" value={value.name || ''} onChange={(e) => setField('name', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Rule type</label>
          <select className="border rounded px-2 py-1 w-full" value={value.ruleType || 'cron'} onChange={(e) => setField('ruleType', e.target.value)}>
            <option value="cron">Recurring (cron)</option>
            <option value="datetime">Single datetime</option>
          </select>
        </div>
      </div>

      {value.ruleType === 'cron' ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input type="time" className="border rounded px-2 py-1" value={value._time || ''} onChange={(e) => setField('_time', e.target.value)} />
            <div className="md:col-span-2" />
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {WEEKDAY_OPTIONS.map((d) => {
              const selected = (value._weekDays || []).includes(d.value);
              return (
                <button key={d.value} type="button" className={`px-2 py-1 rounded ${selected ? 'bg-brand text-white' : 'bg-white border'}`} onClick={() => {
                  const next = new Set(value._weekDays || []);
                  if (next.has(d.value)) next.delete(d.value); else next.add(d.value);
                  setField('_weekDays', Array.from(next).sort((a,b)=>a-b));
                }}>{d.label}</button>
              );
            })}
          </div>

          <div className="mt-2 text-xs text-slate-500">Advanced cron (optional)</div>
          <input className="border rounded px-2 py-1 w-full mt-1" placeholder="e.g. 0 18 * * 5" value={value.ruleCron || ''} onChange={(e) => setField('ruleCron', e.target.value)} />
        </div>
      ) : (
        <div>
          <label className="block text-xs text-slate-600 mb-1">Date & time</label>
          <input className="border rounded px-2 py-1 w-full" type="datetime-local" value={value.ruleDateTime || ''} onChange={(e) => setField('ruleDateTime', e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        <input className="border rounded px-2 py-1" placeholder="Duration minutes" type="number" value={value.durationMinutes || ''} onChange={(e)=>setField('durationMinutes', e.target.value ? Number(e.target.value) : null)} />
        <input className="border rounded px-2 py-1" placeholder="Capacity" type="number" value={value.capacity || ''} onChange={(e)=>setField('capacity', e.target.value ? Number(e.target.value) : null)} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Start date (optional)</label>
          <input
            className="border rounded px-2 py-1 w-full"
            type="date"
            value={value.startDate ? value.startDate.slice(0, 10) : ''}
            onChange={(e) => setField('startDate', e.target.value || null)}
          />
          <p className="text-xs text-slate-400 mt-0.5">
            {value.startDate ? `Generates sessions from ${value.startDate.slice(0, 10)}` : 'Starts from today'}
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">End date (optional)</label>
          <input
            className="border rounded px-2 py-1 w-full"
            type="date"
            value={value.endDate ? value.endDate.slice(0, 10) : ''}
            onChange={(e) => setField('endDate', e.target.value || null)}
          />
          <p className="text-xs text-slate-400 mt-0.5">
            {value.endDate ? `Stops after ${value.endDate.slice(0, 10)}` : 'No end date'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
