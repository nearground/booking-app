import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ScheduleCalendarWidget from 'components/schedule-calendar-widget/ScheduleCalendarWidget';
import { networkAdapter } from 'services/NetworkAdapter';

const formatSpotsLeftText = (availableSpots, totalSpots) => {
  const available = Number(availableSpots);
  const total = Number(totalSpots);

  if (Number.isFinite(available) && Number.isFinite(total) && total > 0) {
    return `${Math.max(0, available)}/${Math.max(0, total)} spots left`;
  }

  return '';
};

const SessionsPreviewPanel = ({
  sessions = [],
  timezone,
  showList = true,
  showCalendar = true,
  emptyStateText = 'No upcoming sessions scheduled yet.',
  maxListItems = 6,
  calendarTitle = 'Sessions Calendar',
  calendarSubtitle = 'Hover a highlighted day for details. Click a day to pin.',
  monthCount = 2,
  enableSessionActions = false,
}) => {
  const [cancellingSessionId, setCancellingSessionId] = useState(null);

  const normalizedSessions = useMemo(
    () =>
      (sessions || []).map((session, index) => ({
        id: session?.id || `session-${index}`,
        title: session?.title || 'Session',
        dateTime: session?.dateTime,
        secondaryLabel: session?.secondaryLabel || '',
        status: session?.status || '',
        metaText:
          formatSpotsLeftText(session?.availableSpots, session?.totalSpots) || session?.metaText || '',
        calendarSource:
          formatSpotsLeftText(session?.availableSpots, session?.totalSpots) ||
          session?.calendarSource ||
          session?.metaText ||
          '',
      })),
    [sessions]
  );

  const visibleSessions = normalizedSessions.slice(0, maxListItems);

  const calendarAppointments = useMemo(
    () =>
      normalizedSessions.map((session) => ({
        id: session.id,
        title: session.title,
        dateTime: session.dateTime,
        source: session.calendarSource,
      })),
    [normalizedSessions]
  );

  const handleCancelSession = async (sessionId) => {
    setCancellingSessionId(sessionId);
    const response = await networkAdapter.patch(`/api/organizers/sessions/${sessionId}/cancel`);
    setCancellingSessionId(null);
    if (!response?.errors?.length) {
      window.location.reload();
    }
  };

  const renderSessionCard = (session) => (
    <div key={session.id} className="border rounded px-3 py-2 flex flex-col gap-1">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
        <p className="text-sm text-slate-700">
          {enableSessionActions ? (
            <Link
              to={`/session-details/${session.id}`}
              className="font-medium text-brand hover:underline cursor-pointer"
            >
              {session.title}
            </Link>
          ) : (
            <span className="font-medium">{session.title}</span>
          )}
          {session.secondaryLabel ? ` · ${session.secondaryLabel}` : ''}
        </p>
        <p className="text-sm text-slate-500">
          {new Date(session.dateTime).toLocaleString([], { timeZone: timezone })}
          {session.metaText ? ` · ${session.metaText}` : ''}
          {session.status === 'cancelled' ? (
            <span className="ml-2 inline-block bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded">cancelled</span>
          ) : null}
        </p>
      </div>
      {enableSessionActions && (
        <div className="flex gap-2 mt-1">
          <Link
            to={`/session-details/${session.id}`}
            className="text-xs px-2 py-1 rounded border border-brand text-brand hover:bg-brand hover:text-white transition-colors"
          >
            View Details
          </Link>
          {session.status !== 'cancelled' && (
            <button
              type="button"
              onClick={() => handleCancelSession(session.id)}
              disabled={cancellingSessionId === session.id}
              className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancellingSessionId === session.id ? 'Cancelling...' : 'Cancel Session'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (!showList && !showCalendar) {
    return null;
  }

  if (!showCalendar) {
    return visibleSessions.length === 0 ? (
      <p className="text-sm text-slate-500">{emptyStateText}</p>
    ) : (
      <div className="space-y-2">
        {visibleSessions.map(renderSessionCard)}
      </div>
    );
  }

  if (!showList) {
    return (
      <ScheduleCalendarWidget
        title={calendarTitle}
        subtitle={calendarSubtitle}
        appointments={calendarAppointments}
        monthCount={monthCount}
        timezone={timezone}
        enableMonthNavigation
        enableSessionActions={enableSessionActions}
      />
    );
  }

  return normalizedSessions.length === 0 ? (
    <p className="text-sm text-slate-500">{emptyStateText}</p>
  ) : (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4">
      <div className="space-y-2">
        {visibleSessions.map(renderSessionCard)}
      </div>

      <ScheduleCalendarWidget
        title={calendarTitle}
        subtitle={calendarSubtitle}
        appointments={calendarAppointments}
        monthCount={monthCount}
        timezone={timezone}
        enableMonthNavigation
        enableSessionActions={enableSessionActions}
      />
    </div>
  );
};

export default SessionsPreviewPanel;
