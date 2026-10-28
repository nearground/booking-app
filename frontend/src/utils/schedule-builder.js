const WEEKDAY_OPTIONS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parseTime = (timeValue) => {
  const [hourString, minuteString] = String(timeValue || '').split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

/**
 * Parses a simple cron expression of the form produced by buildCronExpression:
 *   "M H * * *"        (daily)
 *   "M H * * D[,D…]"  (weekly)
 * Returns { hour, minute, recurrenceType, weekDays } or null on failure.
 */
export const parseCronExpression = (cron) => {
  if (!cron || typeof cron !== 'string') {
    return null;
  }
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }
  const [minuteStr, hourStr, , , dayOfWeekStr] = parts;
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  if (dayOfWeekStr === '*') {
    return { hour, minute, recurrenceType: 'daily', weekDays: [] };
  }
  const weekDays = dayOfWeekStr
    .split(',')
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return { hour, minute, recurrenceType: 'weekly', weekDays };
};

/**
 * Constructs a UTC Date representing a specific wall-clock hour:minute on a
 * given calendar date in the specified IANA timezone.
 *
 * Example: makeDateInTimezone(2026, 4, 12, 14, 29, 'America/Mexico_City')
 *          → Date corresponding to 2:29 PM Mexico City time (UTC-6) = 20:29 UTC.
 *
 * When timezone is falsy, falls back to local-time Date construction.
 */
const makeDateInTimezone = (year, month, day, hour, minute, timezone) => {
  if (!timezone) {
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  // Start from a UTC date at the nominal time, then adjust by the tz offset.
  const nominalUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(nominalUtc);
  const tzYear = parseInt(parts.find((p) => p.type === 'year').value, 10);
  const tzMonth = parseInt(parts.find((p) => p.type === 'month').value, 10);
  const tzDay = parseInt(parts.find((p) => p.type === 'day').value, 10);
  // Intl hour12:false can return "24" for midnight; normalise to 0.
  const tzHour = parseInt(parts.find((p) => p.type === 'hour').value, 10) % 24;
  const tzMinute = parseInt(parts.find((p) => p.type === 'minute').value, 10);

  // offsetMs = (what the target timezone displays nominalUtc as) - nominalUtc
  const offsetMs =
    Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute) -
    Date.UTC(year, month - 1, day, hour, minute);

  return new Date(nominalUtc.getTime() - offsetMs);
};

export const buildCronExpression = ({ recurrenceType, time, weekDays }) => {
  const parsedTime = parseTime(time);
  if (!parsedTime) {
    return null;
  }

  const { hour, minute } = parsedTime;

  if (recurrenceType === 'daily') {
    return `${minute} ${hour} * * *`;
  }

  const normalizedWeekDays = Array.isArray(weekDays)
    ? [...new Set(weekDays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b)
    : [];

  if (normalizedWeekDays.length === 0) {
    return null;
  }

  return `${minute} ${hour} * * ${normalizedWeekDays.join(',')}`;
};

/**
 * Returns an array of upcoming Date occurrences for a schedule.
 *
 * Accepts either:
 *   - { recurrenceType, time, weekDays, timezone?, limit? }  — explicit fields
 *   - { cronExpression, timezone?, limit? }                  — cron string (format
 *       produced by buildCronExpression: "M H * * *" or "M H * * D[,D…]")
 *
 * When `timezone` is supplied all date arithmetic is performed in that IANA
 * timezone so that the returned Date objects represent the correct UTC instant
 * regardless of the browser's local timezone.
 */
export const getUpcomingSchedulePreview = ({
  recurrenceType,
  time,
  weekDays,
  cronExpression,
  timezone,
  limit = 6,
}) => {
  // Resolve parameters — cronExpression takes precedence when time is absent.
  let resolvedRecurrenceType = recurrenceType;
  let resolvedHour;
  let resolvedMinute;
  let resolvedWeekDays = weekDays;

  if (cronExpression && !time) {
    const parsed = parseCronExpression(cronExpression);
    if (!parsed) {
      return [];
    }
    resolvedRecurrenceType = parsed.recurrenceType;
    resolvedHour = parsed.hour;
    resolvedMinute = parsed.minute;
    resolvedWeekDays = parsed.weekDays;
  } else {
    const parsedTime = parseTime(time);
    if (!parsedTime) {
      return [];
    }
    resolvedHour = parsedTime.hour;
    resolvedMinute = parsedTime.minute;
  }

  const now = new Date();
  const selectedWeekDays = new Set((resolvedWeekDays || []).map((day) => Number(day)));
  const results = [];

  // Timezone-aware calendar formatter to get the date in the target timezone.
  const calendarFormatter = timezone
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : null;

  // Weekday formatter to check the day-of-week in the target timezone.
  const weekdayFormatter = timezone
    ? new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    : null;

  for (let dayOffset = 0; dayOffset < 60 && results.length < limit; dayOffset += 1) {
    const referenceDate = new Date(now);
    referenceDate.setDate(now.getDate() + dayOffset);

    let candidateYear;
    let candidateMonth;
    let candidateDay;

    if (calendarFormatter) {
      const [tzYear, tzMonth, tzDay] = calendarFormatter.format(referenceDate).split('-').map(Number);
      candidateYear = tzYear;
      candidateMonth = tzMonth;
      candidateDay = tzDay;
    } else {
      candidateYear = referenceDate.getFullYear();
      candidateMonth = referenceDate.getMonth() + 1;
      candidateDay = referenceDate.getDate();
    }

    const candidateDate = makeDateInTimezone(
      candidateYear,
      candidateMonth,
      candidateDay,
      resolvedHour,
      resolvedMinute,
      timezone,
    );

    if (candidateDate <= now) {
      continue;
    }

    if (resolvedRecurrenceType === 'daily') {
      results.push(candidateDate);
      continue;
    }

    // Weekly: check day-of-week in the target timezone.
    if (weekdayFormatter) {
      const dayNum = WEEKDAY_NAMES.indexOf(weekdayFormatter.format(candidateDate));
      if (selectedWeekDays.has(dayNum)) {
        results.push(candidateDate);
      }
    } else if (selectedWeekDays.has(candidateDate.getDay())) {
      results.push(candidateDate);
    }
  }

  return results;
};

export { WEEKDAY_OPTIONS };
