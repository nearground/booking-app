import React from 'react';

const PickedEditor = ({ value = {}, onChange }) => {
  const setField = (field, v) => onChange({ ...value, [field]: v });

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-slate-600 mb-1">Date & time</label>
        <input className="border rounded px-2 py-1 w-full" type="datetime-local" value={value.dateTime || ''} onChange={(e) => setField('dateTime', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <input className="border rounded px-2 py-1" placeholder="End (optional)" type="datetime-local" value={value.endDateTime || ''} onChange={(e)=>setField('endDateTime', e.target.value)} />
        <input className="border rounded px-2 py-1" placeholder="Capacity" type="number" value={value.capacity || ''} onChange={(e)=>setField('capacity', e.target.value ? Number(e.target.value) : null)} />
      </div>

      <div>
        <label className="block text-xs text-slate-600 mb-1">Note</label>
        <input className="border rounded px-2 py-1 w-full" value={value.note || ''} onChange={(e)=>setField('note', e.target.value)} />
      </div>
    </div>
  );
};

export default PickedEditor;
