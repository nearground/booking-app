import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getCalendarDateKey = (value) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildCalendarMonths = ({
  monthCount,
  startDate,
  appointmentsByDate,
}) => {
  const today = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const monthStartAnchor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  return Array.from({ length: monthCount }, (_, monthOffset) => {
    const monthStart = new Date(
      monthStartAnchor.getFullYear(),
      monthStartAnchor.getMonth() + monthOffset,
      1
    );
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptyCells = monthStart.getDay();
    const dayCells = [];

    for (let emptyIndex = 0; emptyIndex < leadingEmptyCells; emptyIndex += 1) {
      dayCells.push(null);
    }

    for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
      const currentDate = new Date(year, month, dayOfMonth);
      const dateKey = getCalendarDateKey(currentDate);
      const appointments = appointmentsByDate.get(dateKey) || [];

      dayCells.push({
        key: dateKey,
        dayNumber: dayOfMonth,
        isToday: currentDate.getTime() === today.getTime(),
        hasAppointments: appointments.length > 0,
        isPast: currentDate < today,
      });
    }

    const trailingEmptyCells = (7 - (dayCells.length % 7)) % 7;
    for (let emptyIndex = 0; emptyIndex < trailingEmptyCells; emptyIndex += 1) {
      dayCells.push(null);
    }

    return {
      key: `${year}-${month}`,
      label: monthStart.toLocaleString([], { month: 'long', year: 'numeric' }),
      dayCells,
    };
  });
};

const defaultGetAppointmentId = (appointment, index) =>
  appointment?.id || `${appointment?.dateTime || 'appointment'}-${index}`;
const defaultGetAppointmentDateTime = (appointment) => appointment?.dateTime;
const defaultGetAppointmentTitle = (appointment) => appointment?.title || 'Scheduled appointment';
const defaultGetAppointmentSource = (appointment) => appointment?.source || '';

const ScheduleCalendarWidget = ({
  appointments = [],
  monthCount = 2,
  startDate = new Date(),
  title = 'Calendar',
  subtitle = '',
  timezone,
  enableMonthNavigation = false,
  enableSessionActions = false,
  weekdayLabels = DEFAULT_WEEKDAY_LABELS,
  getAppointmentId = defaultGetAppointmentId,
  getAppointmentDateTime = defaultGetAppointmentDateTime,
  getAppointmentTitle = defaultGetAppointmentTitle,
  getAppointmentSource = defaultGetAppointmentSource,
}) => {
  const [hoveredDateKey, setHoveredDateKey] = useState('');
  const [pinnedDateKey, setPinnedDateKey] = useState('');
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0);
  const containerRef = useRef(null);

  const normalizedAppointments = useMemo(
    () =>
      appointments
        .map((appointment, index) => {
          const dateTimeValue = getAppointmentDateTime(appointment);
          const parsedDate = new Date(dateTimeValue);

          if (Number.isNaN(parsedDate.getTime())) {
            return null;
          }

          return {
            id: getAppointmentId(appointment, index),
            title: getAppointmentTitle(appointment),
            source: getAppointmentSource(appointment),
            dateTime: parsedDate,
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime()),
    [appointments, getAppointmentDateTime, getAppointmentId, getAppointmentSource, getAppointmentTitle]
  );

  const appointmentsByDate = useMemo(() => {
    const groupedAppointments = new Map();

    normalizedAppointments.forEach((appointment) => {
      const dateKey = getCalendarDateKey(appointment.dateTime);
      if (!dateKey) {
        return;
      }

      const existingAppointments = groupedAppointments.get(dateKey) || [];
      groupedAppointments.set(dateKey, [...existingAppointments, appointment]);
    });

    return groupedAppointments;
  }, [normalizedAppointments]);

  const months = useMemo(
    () =>
      buildCalendarMonths({
        monthCount,
        startDate,
        appointmentsByDate,
      }),
    [appointmentsByDate, monthCount, startDate]
  );

  const activeDateKey = pinnedDateKey || hoveredDateKey;
  const activeDateAppointments =
    activeDateKey && appointmentsByDate.has(activeDateKey)
      ? appointmentsByDate.get(activeDateKey)
      : [];

  useEffect(() => {
    if (visibleMonthIndex > Math.max(0, months.length - 1)) {
      setVisibleMonthIndex(0);
    }
  }, [months.length, visibleMonthIndex]);

  const visibleMonths =
    enableMonthNavigation && months.length > 0
      ? [months[Math.min(visibleMonthIndex, months.length - 1)]]
      : months;

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!pinnedDateKey) {
        return;
      }

      if (containerRef.current?.contains(event.target)) {
        return;
      }

      setPinnedDateKey('');
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [pinnedDateKey]);

  return (
    <div ref={containerRef} className="relative rounded border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}

      {enableMonthNavigation && months.length > 1 ? (
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            className="h-6 w-6 rounded border border-slate-300 text-xs text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setVisibleMonthIndex((previous) => Math.max(0, previous - 1))}
            disabled={visibleMonthIndex === 0}
            aria-label="Show previous month"
          >
            ←
          </button>
          <button
            type="button"
            className="h-6 w-6 rounded border border-slate-300 text-xs text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() =>
              setVisibleMonthIndex((previous) => Math.min(Math.max(0, months.length - 1), previous + 1))
            }
            disabled={visibleMonthIndex >= Math.max(0, months.length - 1)}
            aria-label="Show next month"
          >
            →
          </button>
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        {visibleMonths.map((month) => (
          <div key={month.key}>
            <p className="text-xs font-semibold text-slate-700 mb-1">{month.label}</p>
            <div className="grid grid-cols-7 gap-1">
              {weekdayLabels.map((weekdayLabel) => (
                <div key={`${month.key}-${weekdayLabel}`} className="text-[11px] text-center text-slate-500">
                  {weekdayLabel}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
              {month.dayCells.map((dayCell, dayIndex) => {
                if (!dayCell) {
                  return <div key={`${month.key}-empty-${dayIndex}`} className="h-8" />;
                }

                const isPinned = pinnedDateKey === dayCell.key;
                const isHovered = hoveredDateKey === dayCell.key;
                const shouldEmphasize = isPinned || isHovered;

                return (
                  <button
                    key={dayCell.key}
                    type="button"
                    onMouseEnter={() => {
                      if (!pinnedDateKey) {
                        setHoveredDateKey(dayCell.hasAppointments ? dayCell.key : '');
                      }
                    }}
                    onMouseLeave={() => {
                      if (!pinnedDateKey) {
                        setHoveredDateKey('');
                      }
                    }}
                    onClick={() => {
                      if (!dayCell.hasAppointments) {
                        return;
                      }

                      setPinnedDateKey(dayCell.key);
                      setHoveredDateKey(dayCell.key);
                    }}
                    className={`h-8 rounded border text-xs flex items-center justify-center ${dayCell.hasAppointments ? 'bg-brand text-white border-brand font-semibold cursor-pointer' : dayCell.isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-700 border-slate-200'} ${dayCell.isToday && !dayCell.hasAppointments ? 'ring-1 ring-brand' : ''} ${shouldEmphasize ? 'ring-2 ring-slate-800/20' : ''}`}
                  >
                    {dayCell.dayNumber}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activeDateAppointments.length > 0 && (
        <div className="absolute z-10 top-3 right-3 w-72 max-w-[calc(100%-1.5rem)] rounded border border-slate-300 bg-white shadow-md p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">
              {new Date(`${activeDateKey}T00:00:00`).toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => {
                setPinnedDateKey('');
                setHoveredDateKey('');
              }}
              aria-label="Close calendar tooltip"
            >
              ✕
            </button>
          </div>

          <ul className="mt-2 space-y-1.5">
            {activeDateAppointments.map((appointment) => (
              <li key={appointment.id} className="text-xs text-slate-700 border border-slate-200 rounded px-2 py-1">
                {enableSessionActions ? (
                  <Link
                    to={`/session-details/${appointment.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {appointment.title}
                  </Link>
                ) : (
                  <p className="font-medium text-slate-800">{appointment.title}</p>
                )}
                <p className="text-slate-500">
                  {appointment.dateTime.toLocaleTimeString([], {
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {appointment.source ? ` · ${appointment.source}` : ''}
                </p>
                {enableSessionActions && (
                  <div className="flex gap-1 mt-1">
                    <Link
                      to={`/session-details/${appointment.id}`}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-brand text-brand hover:bg-brand hover:text-white transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendarWidget;
