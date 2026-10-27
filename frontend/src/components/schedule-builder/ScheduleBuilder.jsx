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
    onChange([...(schedules || []), { kind: 'template', name: '', ruleType: 'cron', ruleCron: null, ruleDateTime: null, durationMinutes: null, capacity: null }]);
  };

  const addPicked = () => {
    onChange([...(schedules || []), { kind: 'picked', dateTime: null, endDateTime: null, capacity: null, note: '' }]);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button type="button" className="px-3 py-1.5 rounded bg-brand text-white" onClick={addTemplate}>Add template</button>
        <button type="button" className="px-3 py-1.5 rounded border" onClick={addPicked}>Add Single Date</button>
      </div>

      <div className="space-y-3">
        {(schedules || []).map((item, idx) => (
          <div key={idx} className="border rounded p-3 bg-white">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-sm font-medium">{item.kind === 'template' ? (item.name || 'Template') : (item.dateTime ? new Date(item.dateTime).toLocaleString() : 'Single Date')}</div>
              <div className="flex gap-2">
                <button type="button" className="px-2 py-1 text-xs rounded border" onClick={() => removeItem(idx)}>Remove</button>
              </div>
            </div>

            {item.kind === 'template' ? (
              <TemplateEditor value={item} onChange={(next) => updateItem(idx, next)} />
            ) : (
              <PickedEditor value={item} onChange={(next) => updateItem(idx, next)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleBuilder;
