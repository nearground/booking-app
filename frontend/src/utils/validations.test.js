import validations from 'utils/validations';

describe('validations.validate', () => {
  test('returns true for a valid email', () => {
    expect(validations.validate('email', 'user@example.com')).toBe(true);
  });

  test('returns true for an email with a longer username', () => {
    expect(validations.validate('email', 'username@example.com')).toBe(true);
  });

  test.each(['reset-e2e@example.invalid', 'first.last+booking@sub.example.travel', 'USER@EXAMPLE.COM'])('accepts reset email %s', (email) => {
    expect(validations.validate('email', email)).toBe(true);
  });

  test('returns false for a string with no @ character', () => {
    expect(validations.validate('email', 'invalid')).toBe(false);
  });

  test('returns false for an empty string', () => {
    expect(validations.validate('email', '')).toBe(false);
  });

  test('returns false for an email with a leading space', () => {
    expect(validations.validate('email', ' leading@space.com')).toBe(false);
  });

  test('returns false for an unknown field name', () => {
    expect(validations.validate('nonexistent', 'anything')).toBe(false);
  });
});
