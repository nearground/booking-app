import { useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';

const PopulateScheduleModal = ({ experienceId, templates, onClose, onPopulated }) => {
  const [templateId, setTemplateId] = useState(templates.length > 0 ? templates[0].id : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePreview = async () => {
    if (!templateId || !startDate || !endDate) {
      setError('Please select a template, start date, and end date.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await networkAdapter.post(
        `/api/experiences/manage/${experienceId}/schedule/preview-populate`,
        { templateId, startDate, endDate }
      );
      if (response?.errors?.length) {
        setError(response.errors[0]);
      } else {
        setPreview(response.data);
      }
    } catch {
      setError('Failed to preview schedule.');
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await networkAdapter.post(
        `/api/experiences/manage/${experienceId}/schedule/populate`,
        { templateId, startDate, endDate }
      );
      if (response?.errors?.length) {
        setError(response.errors[0]);
      } else {
        setPreview(null);
        if (onPopulated) onPopulated(response.data);
      }
    } catch {
      setError('Failed to populate schedule.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Populate Schedule</h3>

        <label className="block text-sm text-slate-600 mb-1">Template</label>
        <select
          className="border rounded px-3 py-2 w-full mb-3"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name || `Template #${tpl.id}`} — {tpl.ruleCron || 'no cron'}
            </option>
          ))}
        </select>

        <label className="block text-sm text-slate-600 mb-1">Start Date</label>
        <input
          type="datetime-local"
          className="border rounded px-3 py-2 w-full mb-3"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <label className="block text-sm text-slate-600 mb-1">End Date</label>
        <input
          type="datetime-local"
          className="border rounded px-3 py-2 w-full mb-3"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {preview && (
          <div className="mb-3 bg-slate-50 rounded p-3 text-sm">
            <p className="font-medium text-slate-700">
              {preview.created} session{preview.created === 1 ? '' : 's'} to create ({preview.skipped} existing skipped)
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
            onClick={handlePreview}
            disabled={loading}
          >
            Preview
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-brand text-white hover:opacity-90"
            onClick={handleGenerate}
            disabled={loading || !preview}
          >
            Generate
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border border-slate-300 text-slate-600"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopulateScheduleModal;
