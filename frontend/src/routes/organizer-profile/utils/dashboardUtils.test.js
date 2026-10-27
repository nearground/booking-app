import {
  buildUpcomingSessionEntries,
  buildPastSessionEntries,
  filterSessionsWithinDays,
  getCalendarDateKey,
  groupSessionsByDate,
} from './dashboardUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = Date.now();
const futureDate = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
const farFutureDate = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

const makeOrganizations = (scheduledExperiences) => [
  {
    name: 'Test Org',
    Experiences: [
      {
        title: 'Mountain Hike',
        capacity: 20,
        ScheduledExperiences: scheduledExperiences,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// buildUpcomingSessionEntries
// ---------------------------------------------------------------------------

describe('buildUpcomingSessionEntries', () => {
  test('returns only future sessions', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: futureDate, availableSpots: 10 },
      { id: 2, dateTime: pastDate, availableSpots: 5 },
    ]);

    const result = buildUpcomingSessionEntries(orgs);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test('sorts sessions by dateTime ascending', () => {
    const closer = new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString();
    const farther = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();
    const orgs = makeOrganizations([
      { id: 2, dateTime: farther, availableSpots: 10 },
      { id: 1, dateTime: closer, availableSpots: 10 },
    ]);

    const result = buildUpcomingSessionEntries(orgs);

    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  test('returns empty array when no organizations', () => {
    expect(buildUpcomingSessionEntries([])).toEqual([]);
    expect(buildUpcomingSessionEntries(undefined)).toEqual([]);
  });

  test('filters out sessions with invalid dates', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: 'not-a-date', availableSpots: 10 },
    ]);

    expect(buildUpcomingSessionEntries(orgs)).toEqual([]);
  });

  test('includes status field in session entries', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: futureDate, availableSpots: 10, status: 'scheduled' },
    ]);

    const result = buildUpcomingSessionEntries(orgs);

    expect(result[0].status).toBe('scheduled');
  });

  test('defaults status to "scheduled" when missing', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: futureDate, availableSpots: 10 },
    ]);

    const result = buildUpcomingSessionEntries(orgs);

    expect(result[0].status).toBe('scheduled');
  });

  test('populates organization name and experience title', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: futureDate, availableSpots: 5 },
    ]);

    const result = buildUpcomingSessionEntries(orgs);

    expect(result[0].organizationName).toBe('Test Org');
    expect(result[0].experienceTitle).toBe('Mountain Hike');
  });

  test('flattens across multiple orgs and experiences', () => {
    const orgs = [
      {
        name: 'Org A',
        Experiences: [
          { title: 'Hike', capacity: 10, ScheduledExperiences: [{ id: 1, dateTime: futureDate, availableSpots: 5 }] },
          { title: 'Dive', capacity: 8, ScheduledExperiences: [{ id: 2, dateTime: futureDate, availableSpots: 3 }] },
        ],
      },
      {
        name: 'Org B',
        Experiences: [
          { title: 'Tour', capacity: 15, ScheduledExperiences: [{ id: 3, dateTime: futureDate, availableSpots: 7 }] },
        ],
      },
    ];

    const result = buildUpcomingSessionEntries(orgs);
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// buildPastSessionEntries
// ---------------------------------------------------------------------------

describe('buildPastSessionEntries', () => {
  test('returns only past sessions', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: futureDate, availableSpots: 10 },
      { id: 2, dateTime: pastDate, availableSpots: 5 },
    ]);

    const result = buildPastSessionEntries(orgs);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  test('sorts past sessions by dateTime descending (newest first)', () => {
    const older = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    const newer = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    const orgs = makeOrganizations([
      { id: 1, dateTime: older, availableSpots: 10 },
      { id: 2, dateTime: newer, availableSpots: 10 },
    ]);

    const result = buildPastSessionEntries(orgs);

    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  test('returns empty array when no past sessions', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: futureDate, availableSpots: 10 },
    ]);

    expect(buildPastSessionEntries(orgs)).toEqual([]);
  });

  test('returns empty array when no organizations', () => {
    expect(buildPastSessionEntries([])).toEqual([]);
    expect(buildPastSessionEntries(undefined)).toEqual([]);
  });

  test('includes status field in past session entries', () => {
    const orgs = makeOrganizations([
      { id: 1, dateTime: pastDate, availableSpots: 0, status: 'completed' },
    ]);

    const result = buildPastSessionEntries(orgs);

    expect(result[0].status).toBe('completed');
  });

  test('populates all expected fields', () => {
    const orgs = makeOrganizations([
      { id: 5, dateTime: pastDate, availableSpots: 3 },
    ]);

    const result = buildPastSessionEntries(orgs);

    expect(result[0]).toEqual(expect.objectContaining({
      id: 5,
      organizationName: 'Test Org',
      experienceTitle: 'Mountain Hike',
      availableSpots: 3,
      totalSpots: 20,
    }));
  });
});

// ---------------------------------------------------------------------------
// filterSessionsWithinDays
// ---------------------------------------------------------------------------

describe('filterSessionsWithinDays', () => {
  test('returns only sessions within the day window', () => {
    const within = [
      { dateTime: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString() },
      { dateTime: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString() },
    ];
    const outside = [
      { dateTime: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const result = filterSessionsWithinDays([...within, ...outside], 7);

    expect(result).toHaveLength(2);
  });

  test('excludes past sessions', () => {
    const sessions = [
      { dateTime: pastDate },
    ];

    expect(filterSessionsWithinDays(sessions, 7)).toEqual([]);
  });

  test('returns empty array for empty input', () => {
    expect(filterSessionsWithinDays([], 7)).toEqual([]);
    expect(filterSessionsWithinDays(undefined, 7)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getCalendarDateKey
// ---------------------------------------------------------------------------

describe('getCalendarDateKey', () => {
  test('formats a valid date as YYYY-MM-DD', () => {
    expect(getCalendarDateKey(new Date(2026, 3, 12))).toBe('2026-04-12');
  });

  test('returns empty string for invalid date', () => {
    expect(getCalendarDateKey('not-a-date')).toBe('');
  });

  test('handles ISO date string', () => {
    expect(getCalendarDateKey('2026-01-15T10:00:00Z')).toMatch(/^2026-01-1/);
  });
});

// ---------------------------------------------------------------------------
// groupSessionsByDate
// ---------------------------------------------------------------------------

describe('groupSessionsByDate', () => {
  test('groups sessions by date key', () => {
    const sessions = [
      { dateTime: '2026-04-12T10:00:00Z' },
      { dateTime: '2026-04-12T14:00:00Z' },
      { dateTime: '2026-04-13T09:00:00Z' },
    ];

    const result = groupSessionsByDate(sessions);

    // Keys depend on timezone, just verify grouping
    expect(result.size).toBeGreaterThanOrEqual(1);
    const allValues = [...result.values()].flat();
    expect(allValues).toHaveLength(3);
  });

  test('returns empty map for empty input', () => {
    const result = groupSessionsByDate([]);
    expect(result.size).toBe(0);
  });

  test('sorts sessions within each date group by dateTime', () => {
    const sessions = [
      { dateTime: '2026-04-12T14:00:00Z' },
      { dateTime: '2026-04-12T08:00:00Z' },
    ];

    const result = groupSessionsByDate(sessions);
    const values = [...result.values()].flat();

    if (values.length > 1) {
      const first = new Date(values[0].dateTime).getTime();
      const second = new Date(values[1].dateTime).getTime();
      expect(first).toBeLessThanOrEqual(second);
    }
  });
});
