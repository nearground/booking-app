import { formatDate, getReadableMonthFormat } from 'utils/date-helpers';

describe('formatDate', () => {
  test('formats January 5, 2022 as 05/01/2022', () => {
    expect(formatDate(new Date(2022, 0, 5))).toBe('05/01/2022');
  });

  test('formats December 31, 2022 as 31/12/2022', () => {
    expect(formatDate(new Date(2022, 11, 31))).toBe('31/12/2022');
  });

  test('formats January 15, 2022 as 15/01/2022', () => {
    expect(formatDate(new Date(2022, 0, 15))).toBe('15/01/2022');
  });

  test('returns undefined for undefined input', () => {
    expect(formatDate(undefined)).toBeUndefined();
  });

  test('returns undefined for null input', () => {
    expect(formatDate(null)).toBeUndefined();
  });

  test('returns undefined for an invalid Date', () => {
    expect(formatDate(new Date('invalid'))).toBeUndefined();
  });

  test('returns undefined for a string (not a Date instance)', () => {
    expect(formatDate('2022-01-01')).toBeUndefined();
  });
});

describe('getReadableMonthFormat', () => {
  test('formats 01-01-2022 as 1 January 2022', () => {
    expect(getReadableMonthFormat('01-01-2022')).toBe('1 January 2022');
  });

  test('formats 25-12-2023 as 25 December 2023', () => {
    expect(getReadableMonthFormat('25-12-2023')).toBe('25 December 2023');
  });

  test('formats 05-06-2024 as 5 June 2024', () => {
    expect(getReadableMonthFormat('05-06-2024')).toBe('5 June 2024');
  });

  test('returns empty string for empty input', () => {
    expect(getReadableMonthFormat('')).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(getReadableMonthFormat(undefined)).toBe('');
  });
});
