import { buildCronExpression, getUpcomingSchedulePreview, WEEKDAY_OPTIONS } from 'utils/schedule-builder';

describe('buildCronExpression', () => {
  test('daily 14:30 → "30 14 * * *"', () => {
    expect(buildCronExpression({ recurrenceType: 'daily', time: '14:30' })).toBe('30 14 * * *');
  });

  test('daily 00:00 → "0 0 * * *"', () => {
    expect(buildCronExpression({ recurrenceType: 'daily', time: '00:00' })).toBe('0 0 * * *');
  });

  test('daily 23:59 → "59 23 * * *"', () => {
    expect(buildCronExpression({ recurrenceType: 'daily', time: '23:59' })).toBe('59 23 * * *');
  });

  test('weekly with [1,3,5] → "0 9 * * 1,3,5"', () => {
    expect(
      buildCronExpression({ recurrenceType: 'weekly', time: '09:00', weekDays: [1, 3, 5] })
    ).toBe('0 9 * * 1,3,5');
  });

  test('weekly with [0,6] → "0 9 * * 0,6"', () => {
    expect(
      buildCronExpression({ recurrenceType: 'weekly', time: '09:00', weekDays: [0, 6] })
    ).toBe('0 9 * * 0,6');
  });

  test('weekly with empty weekDays → null', () => {
    expect(
      buildCronExpression({ recurrenceType: 'weekly', time: '09:00', weekDays: [] })
    ).toBeNull();
  });

  test('weekly with duplicate weekDays are deduplicated', () => {
    expect(
      buildCronExpression({ recurrenceType: 'weekly', time: '09:00', weekDays: [1, 1, 3] })
    ).toBe('0 9 * * 1,3');
  });

  test('weekly out-of-range day 8 is filtered', () => {
    expect(
      buildCronExpression({ recurrenceType: 'weekly', time: '09:00', weekDays: [8, 1] })
    ).toBe('0 9 * * 1');
  });

  test('daily with hour 25 → null (out of range)', () => {
    expect(buildCronExpression({ recurrenceType: 'daily', time: '25:00' })).toBeNull();
  });

  test('daily with non-numeric time → null', () => {
    expect(buildCronExpression({ recurrenceType: 'daily', time: 'abc' })).toBeNull();
  });

  test('daily with undefined time → null', () => {
    expect(buildCronExpression({ recurrenceType: 'daily', time: undefined })).toBeNull();
  });

  test('weekly weekDays are sorted ascending', () => {
    expect(
      buildCronExpression({ recurrenceType: 'weekly', time: '10:30', weekDays: [4, 2] })
    ).toBe('30 10 * * 2,4');
  });
});

describe('getUpcomingSchedulePreview', () => {
  test('daily with limit 3 returns up to 3 future Date instances', () => {
    const results = getUpcomingSchedulePreview({ recurrenceType: 'daily', time: '23:59', limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
    results.forEach((d) => {
      expect(d).toBeInstanceOf(Date);
      expect(d.getTime()).toBeGreaterThan(Date.now());
    });
  });

  test('invalid time returns empty array', () => {
    expect(
      getUpcomingSchedulePreview({ recurrenceType: 'daily', time: undefined })
    ).toEqual([]);
  });

  test('weekly with limit 2 returns up to 2 future Date instances', () => {
    const results = getUpcomingSchedulePreview({
      recurrenceType: 'weekly',
      time: '09:00',
      weekDays: [1],
      limit: 2,
    });
    expect(results.length).toBeLessThanOrEqual(2);
    results.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  test('no limit param defaults to at most 6 results', () => {
    const results = getUpcomingSchedulePreview({ recurrenceType: 'daily', time: '09:00' });
    expect(results.length).toBeLessThanOrEqual(6);
  });

  test('cronExpression daily resolves without time param', () => {
    const results = getUpcomingSchedulePreview({ cronExpression: '0 9 * * *', limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
    results.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  test('cronExpression weekly resolves without time param', () => {
    const results = getUpcomingSchedulePreview({ cronExpression: '0 9 * * 1,3', limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
    results.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  test('invalid cronExpression returns empty array', () => {
    expect(getUpcomingSchedulePreview({ cronExpression: 'not-a-cron' })).toEqual([]);
  });

  test('both cronExpression and time: time takes precedence', () => {
    // time is defined so it should be used; cron is ignored
    const results = getUpcomingSchedulePreview({ cronExpression: '0 9 * * *', time: '10:00', recurrenceType: 'daily', limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
    results.forEach((d) => {
      // When no timezone is provided, the hour is local-timezone hour
      expect(d.getHours()).toBe(10);
      expect(d.getMinutes()).toBe(0);
    });
  });

  test('timezone: dates display the requested wall-clock time in that timezone', () => {
    // Request 06:00 in America/Mexico_City (UTC-6).
    // The returned Date should display as 06:00 in that timezone.
    const results = getUpcomingSchedulePreview({
      recurrenceType: 'daily',
      time: '06:00',
      timezone: 'America/Mexico_City',
      limit: 2,
    });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((d) => {
      const displayedHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        hour12: false,
      }).format(d);
      expect(Number(displayedHour)).toBe(6);
    });
  });

  test('timezone with cronExpression: displays correct wall-clock time', () => {
    const results = getUpcomingSchedulePreview({
      cronExpression: '0 14 * * *',
      timezone: 'America/Mexico_City',
      limit: 2,
    });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((d) => {
      const displayedHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        hour12: false,
      }).format(d);
      expect(Number(displayedHour)).toBe(14);
    });
  });
});

describe('WEEKDAY_OPTIONS', () => {
  test('contains 7 entries', () => {
    expect(WEEKDAY_OPTIONS).toHaveLength(7);
  });

  test('values span 0 through 6 in order', () => {
    expect(WEEKDAY_OPTIONS.map((o) => o.value)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('labels are Sun through Sat', () => {
    expect(WEEKDAY_OPTIONS.map((o) => o.label)).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
  });

  test('each entry has label and value properties', () => {
    WEEKDAY_OPTIONS.forEach((o) => {
      expect(o).toHaveProperty('label');
      expect(o).toHaveProperty('value');
    });
  });

  test('Sunday entry has value 0 and label "Sun"', () => {
    expect(WEEKDAY_OPTIONS[0]).toEqual({ label: 'Sun', value: 0 });
  });
});
