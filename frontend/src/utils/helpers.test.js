import isEmpty from 'utils/helpers';

describe('isEmpty', () => {
  test('empty object returns true', () => {
    expect(isEmpty({})).toBe(true);
  });

  test('object with a property returns false', () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  test('object with undefined value returns false (key exists)', () => {
    expect(isEmpty({ key: undefined })).toBe(false);
  });

  test('empty array returns true', () => {
    expect(isEmpty([])).toBe(true);
  });

  test('non-empty array returns false', () => {
    expect(isEmpty([1, 2])).toBe(false);
  });
});
