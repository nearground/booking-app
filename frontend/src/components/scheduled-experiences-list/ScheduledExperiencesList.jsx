import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'react-date-range';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { networkAdapter } from '../../services/NetworkAdapter';
import useOutsideClickHandler from '../../hooks/useOutsideClickHandler';
import ExperienceSessionBookingModal from '../experience-session-booking-modal/ExperienceSessionBookingModal';

const buildTimezoneDateKey = (dateValue, timezone) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
};

const ScheduledExperiencesList = ({
  experienceCode,
  visibleCount = 6,
  startingPrice,
  experienceTitle,
  experienceSubtitle,
  experienceDurationMinutes,
  experienceThumbnail = '',
  ticketTiers,
  experienceUserQuestionnary = [],
  scheduleTimezone = 'UTC',
  experienceLocation = null,
  previewSessions = null,
  initialCartEdit = null,
}) => {
  const isUsingPreviewSessions = Array.isArray(previewSessions);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(!isUsingPreviewSessions);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: visibleCount });
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(new Date());
  const [calendarDayStatuses, setCalendarDayStatuses] = useState({});
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [scheduleStartDate, setScheduleStartDate] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLightViewOpen, setIsLightViewOpen] = useState(false);
  const [pendingCartEdit, setPendingCartEdit] = useState(null);
  const calendarWrapperRef = useRef(null);
  const selectedEventRowRef = useRef(null);
  const canOpenSessionModal = Boolean(experienceCode) || isUsingPreviewSessions;

  useOutsideClickHandler(calendarWrapperRef, () => {
    setIsCalendarVisible(false);
  });

  const currentVisibleCount = Math.max(1, visibleCount);
  const canGoLeft = currentPage > 1;
  const canGoRight = currentPage < (pagination.totalPages || 1);
  const normalizedPreviewEvents = useMemo(() => {
    if (!isUsingPreviewSessions) {
      return [];
    }

    return previewSessions
      .map((session, index) => {
        const dateTime =
          typeof session === 'string' || session instanceof Date
            ? session
            : session?.dateTime;
        const parsedDate = new Date(dateTime);

        if (Number.isNaN(parsedDate.getTime())) {
          return null;
        }

        return {
          id: session?.id ?? `preview-session-${index}`,
          dateTime: parsedDate.toISOString(),
          availableSpots: Number.isFinite(Number(session?.availableSpots))
            ? Number(session.availableSpots)
            : 999,
        };
      })
      .filter(Boolean)
      .sort((left, right) => new Date(left.dateTime) - new Date(right.dateTime));
  }, [isUsingPreviewSessions, previewSessions]);

  const fetchCalendarSummary = useCallback(async () => {
    if (isUsingPreviewSessions) {
      const monthFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: scheduleTimezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
      });

      const activeMonth = monthFormatter.format(calendarMonthDate);
      const dayStatusMap = normalizedPreviewEvents.reduce((accumulator, session) => {
        const dayKey = buildTimezoneDateKey(session.dateTime, scheduleTimezone);
        if (dayKey && dayKey.startsWith(activeMonth)) {
          accumulator[dayKey] = 'open';
        }
        return accumulator;
      }, {});

      setCalendarDayStatuses(dayStatusMap);
      return;
    }

    if (!experienceCode) {
      setCalendarDayStatuses({});
      return;
    }

    const response = await networkAdapter.get(`/api/experiences/${experienceCode}/schedule/calendar`, {
      month: format(calendarMonthDate, 'yyyy-MM'),
    });

    const dayStatusMap = (response?.elements || []).reduce((accumulator, daySummary) => {
      if (daySummary.date && daySummary.status) {
        accumulator[daySummary.date] = daySummary.status;
      }
      return accumulator;
    }, {});

    setCalendarDayStatuses(dayStatusMap);
  }, [calendarMonthDate, experienceCode, isUsingPreviewSessions, normalizedPreviewEvents, scheduleTimezone]);

  const showPreviousEvents = () => {
    if (!canGoLeft) {
      return;
    }

    setCurrentPage((previousPage) => Math.max(1, previousPage - 1));
  };

  const showNextEvents = () => {
    if (!canGoRight) {
      return;
    }

    setCurrentPage((previousPage) => previousPage + 1);
  };

  const handleCalendarDateChange = (selectedDate) => {
    const nextSelectedDateKey = buildTimezoneDateKey(selectedDate, scheduleTimezone);
    setCalendarMonthDate(selectedDate);
    setSelectedDateKey(nextSelectedDateKey);
    setScheduleStartDate(nextSelectedDateKey);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (isUsingPreviewSessions) {
      setLoading(false);
      setError(null);

      const filteredEvents = selectedDateKey
        ? normalizedPreviewEvents.filter(
            (event) => buildTimezoneDateKey(event.dateTime, scheduleTimezone) === selectedDateKey
          )
        : normalizedPreviewEvents;

      const totalPages = Math.max(1, Math.ceil(filteredEvents.length / currentVisibleCount));
      const safeCurrentPage = Math.min(currentPage, totalPages);
      const pageStart = (safeCurrentPage - 1) * currentVisibleCount;
      const nextEvents = filteredEvents.slice(pageStart, pageStart + currentVisibleCount);

      setEvents(nextEvents);
      setPagination({
        currentPage: safeCurrentPage,
        totalPages,
        pageSize: currentVisibleCount,
      });

      if (safeCurrentPage !== currentPage) {
        setCurrentPage(safeCurrentPage);
      }

      return;
    }

    const fetchScheduledExperiences = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await networkAdapter.get(`/api/experiences/${experienceCode}/schedule`, {
          currentPage,
          pageSize: currentVisibleCount,
          ...(scheduleStartDate ? { startDate: scheduleStartDate } : {}),
        });

        if (response && response.elements) {
          setEvents(response.elements);
          setPagination(response.paging || { currentPage: 1, totalPages: 1, pageSize: currentVisibleCount });
        } else {
          setEvents([]);
          setPagination({ currentPage: 1, totalPages: 1, pageSize: currentVisibleCount });
        }
      } catch (err) {
        console.error('Error fetching scheduled experiences:', err);
        setError('Could not load schedule.');
      } finally {
        setLoading(false);
      }
    };

    if (experienceCode) {
      fetchScheduledExperiences();
    }
  }, [
    currentPage,
    currentVisibleCount,
    experienceCode,
    isUsingPreviewSessions,
    normalizedPreviewEvents,
    scheduleStartDate,
    scheduleTimezone,
    selectedDateKey,
  ]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedDateKey(null);
    setScheduleStartDate(null);
  }, [experienceCode, currentVisibleCount, isUsingPreviewSessions]);


  /*
  useEffect(() => {
    if (!pendingScrollToSelectedDate) {
      return;
    }

    if (selectedEventRowRef.current) {
      selectedEventRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }

    setPendingScrollToSelectedDate(false);
  }, [events, pendingScrollToSelectedDate]);
  */


  useEffect(() => {
    if (!isCalendarVisible) {
      return;
    }

    fetchCalendarSummary().catch((calendarError) => {
      console.error('Error fetching scheduled experiences calendar summary:', calendarError);
      setCalendarDayStatuses({});
    });
  }, [fetchCalendarSummary, isCalendarVisible]);

  useEffect(() => {
    if (!initialCartEdit) {
      return;
    }

    setPendingCartEdit(initialCartEdit);
  }, [initialCartEdit]);

  useEffect(() => {
    if (!pendingCartEdit || loading) {
      return;
    }

    const targetId = String(pendingCartEdit.metadata?.ScheduledExperienceId || pendingCartEdit.ProductId);
    const matchingSession = events.find((session) => String(session.id) === targetId);
    const fallbackSession = {
      id: pendingCartEdit.metadata?.ScheduledExperienceId || pendingCartEdit.ProductId,
      dateTime: pendingCartEdit.metadata?.sessionDateTime,
      availableSpots: Math.max(1, Number(pendingCartEdit.metadata?.numberOfAttendees) || 1),
    };

    if (matchingSession) {
      setSelectedSession(matchingSession);
    } else if (pendingCartEdit.metadata?.sessionDateTime) {
      setSelectedSession(fallbackSession);
    }

    setIsLightViewOpen(true);
    setPendingCartEdit(null);
  }, [pendingCartEdit, loading, events]);

  if (loading) {
    return <div className="animate-pulse bg-slate-200 h-24 rounded-lg mt-4 w-full"></div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm mt-2">{error}</div>;
  }

  if (events.length === 0) {
    return <div className="text-slate-500 text-sm mt-4">There are no upcoming experiences scheduled currently.</div>;
  }

  const firstMatchingExperienceId = selectedDateKey
    ? events.find((experience) => buildTimezoneDateKey(experience.dateTime, scheduleTimezone) === selectedDateKey)?.id
    : null;

  const normalizedStartingPrice = Number(startingPrice || 0).toFixed(2);

  const openSessionLightView = (session) => {
    setSelectedSession(session);
    setIsLightViewOpen(true);
  };

  return (
    <>
    <div className="bg-white border border-slate-200 rounded-xl p-4 mt-6 shadow-sm" data-testid="schedule-widget">
      <div ref={calendarWrapperRef}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Upcoming Sessions</h3>
            <p className="text-sm text-slate-600 mt-0.5">From ${normalizedStartingPrice}/USD per guest</p>
            <p className="text-xs text-slate-500 mt-0.5">Times shown in {scheduleTimezone}</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setIsCalendarVisible((currentValue) => !currentValue)}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
              aria-label="Toggle schedule availability calendar"
              data-testid="schedule-widget__calendar-btn"
            >
              <FontAwesomeIcon icon={faCalendar} className="mr-2" />
              Calendar
            </button>
          </div>
        </div>

        {isCalendarVisible && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-2 shadow-sm flex justify-center">
            <Calendar
              date={calendarMonthDate}
              shownDate={calendarMonthDate}
              onChange={handleCalendarDateChange}
              onShownDateChange={setCalendarMonthDate}
              minDate={new Date()}
              color="transparent"
              className="w-full flex justify-center custom-calendar"
              dayContentRenderer={(day) => {
                const dayKey = buildTimezoneDateKey(day, scheduleTimezone);
                const status = calendarDayStatuses[dayKey];

                const isSelected = selectedDateKey === dayKey;
                let statusClass = 'text-slate-700';

                if (isSelected) {
                   statusClass = 'bg-blue-600 text-white font-semibold';
                } else if (status === 'open') {
                   statusClass = 'bg-green-100 text-green-700';
                } else if (status === 'full') {
                   statusClass = 'bg-slate-200 text-slate-600';
                }

                return (
                  <div className="h-full w-full flex items-center justify-center relative p-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${statusClass}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
           {events.map((experience) => {
             const date = new Date(experience.dateTime);
             const dateStr = date.toLocaleDateString([], {
               timeZone: scheduleTimezone,
               weekday: 'short',
               month: 'short',
               day: 'numeric',
             });
             const timeStr = date.toLocaleTimeString([], {
               timeZone: scheduleTimezone,
               hour: 'numeric',
               minute: '2-digit',
             });
             
             return (
                <div
                  key={experience.id}
                  ref={experience.id === firstMatchingExperienceId ? selectedEventRowRef : null}
                  data-testid="session-card"
                  className={`flex justify-between items-center border-b border-slate-100 pb-2 last:border-0 last:pb-0 rounded-md px-2 ${canOpenSessionModal ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => {
                    if (canOpenSessionModal) {
                      openSessionLightView(experience);
                    }
                  }}
                >
                    <div>
                        <p className="font-medium text-slate-700">{dateStr}</p>
                        <p className="text-sm text-slate-500">{timeStr}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${experience.availableSpots > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {experience.availableSpots > 0 ? `${experience.availableSpots} spots left` : 'Full'}
                        </span>
                    </div>
                </div>
             );
        })}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={showPreviousEvents}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Scroll sessions left"
          data-testid="schedule-widget__prev"
          disabled={!canGoLeft}
        >
          ←
        </button>
        <button
          type="button"
          onClick={showNextEvents}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Scroll sessions right"
          data-testid="schedule-widget__next"
          disabled={!canGoRight}
        >
          →
        </button>
      </div>
    </div>
    {canOpenSessionModal && (
      <ExperienceSessionBookingModal
        isOpen={isLightViewOpen}
        onClose={() => setIsLightViewOpen(false)}
        session={selectedSession}
        experienceCode={experienceCode}
        experienceTitle={experienceTitle}
        experienceSubtitle={experienceSubtitle}
        experienceDurationMinutes={experienceDurationMinutes}
        experienceThumbnail={experienceThumbnail}
        ticketTiers={ticketTiers}
        experienceUserQuestionnary={experienceUserQuestionnary}
        isPreview={isUsingPreviewSessions}
        initialCartEdit={initialCartEdit}
        experienceLocation={experienceLocation}
      />
    )}
    </>
  );
};

export default ScheduledExperiencesList;
