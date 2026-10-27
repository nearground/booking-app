export const CALENDAR_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getCalendarDateKey = (value) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildCalendarMonths = ({ monthCount = 2, startDate = new Date(), sessionsByDate = new Map() }) => {
  const today = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const monthAnchor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  return Array.from({ length: monthCount }, (_, index) => {
    const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + index, 1);
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
      const sessions = sessionsByDate.get(dateKey) || [];

      dayCells.push({
        key: dateKey,
        dayNumber: dayOfMonth,
        isToday: currentDate.getTime() === today.getTime(),
        hasSessions: sessions.length > 0,
        sessions,
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

export const buildUpcomingSessionEntries = (organizations = []) => {
  const now = Date.now();

  return organizations
    .flatMap((organization) =>
      (organization.Experiences || organization.Events || []).flatMap((experience) =>
        (experience.ScheduledExperiences || []).map((scheduledExperience) => ({
          organizationName: organization.name || 'Organization',
          experienceTitle: experience.title || 'Experience',
          dateTime: scheduledExperience.dateTime,
          availableSpots: Number(scheduledExperience.availableSpots || 0),
          totalSpots: Number(experience.capacity || 0),
          id: scheduledExperience.id,
          status: scheduledExperience.status || 'scheduled',
        }))
      )
    )
    .filter((session) => {
      const parsedDate = new Date(session.dateTime);
      return !Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() >= now;
    })
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());
};

export const buildPastSessionEntries = (organizations = []) => {
  const now = Date.now();

  return organizations
    .flatMap((organization) =>
      (organization.Experiences || organization.Events || []).flatMap((experience) =>
        (experience.ScheduledExperiences || []).map((scheduledExperience) => ({
          organizationName: organization.name || 'Organization',
          experienceTitle: experience.title || 'Experience',
          dateTime: scheduledExperience.dateTime,
          availableSpots: Number(scheduledExperience.availableSpots || 0),
          totalSpots: Number(experience.capacity || 0),
          id: scheduledExperience.id,
          status: scheduledExperience.status || 'scheduled',
        }))
      )
    )
    .filter((session) => {
      const parsedDate = new Date(session.dateTime);
      return !Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() < now;
    })
    .sort((left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime());
};

export const filterSessionsWithinDays = (sessions = [], dayCount = 7) => {
  const now = Date.now();
  const threshold = now + dayCount * 24 * 60 * 60 * 1000;

  return sessions.filter((session) => {
    const parsedDate = new Date(session.dateTime);
    const time = parsedDate.getTime();
    return time >= now && time <= threshold;
  });
};

export const groupSessionsByDate = (sessions = []) => {
  const groupedSessions = new Map();

  sessions.forEach((session) => {
    const dateKey = getCalendarDateKey(session.dateTime);
    if (!dateKey) {
      return;
    }

    const existingSessions = groupedSessions.get(dateKey) || [];
    groupedSessions.set(dateKey, [...existingSessions, session]);
  });

  groupedSessions.forEach((dateSessions, key) => {
    groupedSessions.set(
      key,
      [...dateSessions].sort(
        (left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime()
      )
    );
  });

  return groupedSessions;
};
