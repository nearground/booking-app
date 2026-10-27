import { useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';

const UpdateStartDateModal = ({ experienceId, onClose, onConfirmed }) => {
  const [newStartDate, setNewStartDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [cancelEmpty, setCancelEmpty] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handlePreview = async () => {
    if (!newStartDate) return;
    setLoading(true);
    setError('');
    try {
      const response = await networkAdapter.post(
        `/api/experiences/manage/${experienceId}/schedule/preview-start-date`,
        { newStartDate }
      );
      if (response?.data?.errors?.length) {
        setError(response.data.errors.join(', '));
      } else {
        setPreview(response?.data?.data || response?.data);
        if (response?.data?.data?.suggestedStartDate && !newStartDate) {
          setNewStartDate(response.data.data.suggestedStartDate);
        }
      }
    } catch (err) {
      setError('Failed to preview start date update');
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!newStartDate) return;
    setLoading(true);
    setError('');
    try {
      const response = await networkAdapter.post(
        `/api/experiences/manage/${experienceId}/schedule/update-start-date`,
        { newStartDate, cancelEmptySessions: cancelEmpty }
      );
      if (response?.data?.errors?.length) {
        setError(response.data.errors.join(', '));
      } else {
        setResult(response?.data?.data || response?.data);
        setConfirmed(true);
      }
    } catch (err) {
      setError('Failed to update start date');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Update Schedule Start Date</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600 text-xl" onClick={onClose}>&times;</button>
        </div>

        {confirmed ? (
          <div>
            <div className="bg-green-50 border border-green-400 text-green-800 p-3 rounded mb-3">
              <p className="font-medium">Start date updated successfully</p>
              <p className="text-sm mt-1">{result?.cancelledCount || 0} empty session{result?.cancelledCount === 1 ? '' : 's'} cancelled.</p>
              {result?.skippedNonEmpty?.length > 0 && (
                <p className="text-sm mt-1">{result.skippedNonEmpty.length} session{result.skippedNonEmpty.length === 1 ? '' : 's'} with bookings left unchanged.</p>
              )}
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded bg-brand text-white w-full"
              onClick={() => { onConfirmed(); onClose(); }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">New start date</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={newStartDate}
                onChange={(e) => { setNewStartDate(e.target.value); setPreview(null); }}
              />
            </div>

            {!preview && (
              <button
                type="button"
                className="px-4 py-2 rounded bg-slate-700 text-white w-full mb-3"
                disabled={!newStartDate || loading}
                onClick={handlePreview}
              >
                {loading ? 'Loading...' : 'Preview'}
              </button>
            )}

            {preview && (
              <div className="mb-4">
                <div className="border rounded p-3 bg-slate-50 mb-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">Sessions before {newStartDate}:</p>
                  <p className="text-sm text-slate-600">
                    {preview.emptySessions?.length || 0} empty session{(preview.emptySessions?.length || 0) === 1 ? '' : 's'} (can be cancelled)
                  </p>
                  <p className="text-sm text-slate-600">
                    {preview.nonEmptySessions?.length || 0} session{(preview.nonEmptySessions?.length || 0) === 1 ? '' : 's'} with bookings
                  </p>
                </div>

                {preview.nonEmptySessions?.length > 0 && (
                  <div className="bg-red-50 border border-red-400 text-red-800 p-3 rounded mb-3">
                    <p className="text-sm font-medium">Sessions with existing bookings will NOT be cancelled.</p>
                    <p className="text-sm mt-1">You must manage these manually from the Sessions tab.</p>
                    <ul className="text-xs mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {preview.nonEmptySessions.map((s) => (
                        <li key={s.id}>
                          {new Date(s.dateTime).toLocaleString()} — {s.reservationCount} booking{s.reservationCount === 1 ? '' : 's'} ({s.totalAttendees} attendee{s.totalAttendees === 1 ? '' : 's'})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
                  <input
                    type="checkbox"
                    checked={cancelEmpty}
                    onChange={(e) => setCancelEmpty(e.target.checked)}
                  />
                  Cancel empty sessions before the new start date
                </label>

                <button
                  type="button"
                  className="px-4 py-2 rounded bg-brand text-white w-full"
                  disabled={loading}
                  onClick={handleConfirm}
                >
                  {loading ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateStartDateModal;
