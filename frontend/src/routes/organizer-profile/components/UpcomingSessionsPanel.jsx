import { useMemo, useState } from 'react';
import SessionsPreviewPanel from 'components/sessions-preview-panel/SessionsPreviewPanel';

const UpcomingSessionsPanel = ({
  upcomingSessionEntries,
  pastSessionEntries = [],
  isLoadingPast = false,
  onRequestPastSessions,
}) => {
  const [viewMode, setViewMode] = useState('upcoming');

  const activeEntries = viewMode === 'upcoming' ? upcomingSessionEntries : pastSessionEntries;

  const normalizedSessions = useMemo(
    () =>
      (activeEntries || []).map((session) => ({
        id: session.id,
        title: session.experienceTitle,
        secondaryLabel: session.organizationName,
        dateTime: session.dateTime,
        availableSpots: Number(session.availableSpots || 0),
        totalSpots: Number(session.totalSpots || 0),
        status: session.status,
      })),
    [activeEntries]
  );

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'past' && onRequestPastSessions && pastSessionEntries.length === 0) {
      onRequestPastSessions();
    }
  };

  return (
    <div className="bg-white rounded shadow-md p-4 md:p-6 mb-6">
      <div className="flex justify-between items-center mb-3 gap-2">
        <h3 className="text-lg font-semibold text-slate-700">Scheduled Sessions</h3>
        <div className="flex gap-1">
          <button
            type="button"
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'upcoming' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => handleViewModeChange('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'past' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => handleViewModeChange('past')}
          >
            Past
          </button>
        </div>
      </div>

      {isLoadingPast && viewMode === 'past' ? (
        <div className="animate-pulse bg-slate-100 h-20 rounded" />
      ) : (
        <SessionsPreviewPanel
          sessions={normalizedSessions}
          emptyStateText={viewMode === 'upcoming' ? 'No upcoming sessions scheduled yet.' : 'No past sessions found.'}
          enableSessionActions
        />
      )}
    </div>
  );
};

export default UpcomingSessionsPanel;
