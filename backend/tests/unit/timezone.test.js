import {
  isValidIanaTimezone,
  normalizeTimezone,
  DEFAULT_TIMEZONE,
} from '../../server/utils/timezone.js';

describe('DEFAULT_TIMEZONE', () => {
  test('equals UTC', () => {
    expect(DEFAULT_TIMEZONE).toBe('UTC');
  });
});

describe('isValidIanaTimezone', () => {
  test.each([
    ['America/Mexico_City', true],
    ['UTC', true],
    ['America/New_York', true],
    ['invalid/zone', false],
    ['', false],
    [null, false],
    [undefined, false],
    [{}, false],
  ])('%p → %s', (input, expected) => {
    expect(isValidIanaTimezone(input)).toBe(expected);
  });
});

describe('normalizeTimezone', () => {
  test('returns valid timezone unchanged', () => {
    expect(normalizeTimezone('America/New_York')).toBe('America/New_York');
  });

  test('trims surrounding whitespace from a valid timezone', () => {
    expect(normalizeTimezone('  America/New_York  ')).toBe('America/New_York');
  });

  test('falls back to valid fallback when input is invalid', () => {
    expect(normalizeTimezone('bad/zone', 'UTC')).toBe('UTC');
  });

  test('falls back to UTC when both input and fallback are invalid', () => {
    expect(normalizeTimezone('bad/zone', 'also/bad')).toBe('UTC');
  });

  test('returns UTC when both arguments are undefined', () => {
    expect(normalizeTimezone(undefined, undefined)).toBe('UTC');
  });

  test('returns UTC when both arguments are null', () => {
    expect(normalizeTimezone(null, null)).toBe('UTC');
  });
});
