jest.mock('../../server/models/User.model.js', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

import User from '../../server/models/User.model.js';
import {
  validateEmail,
  validatePhoneNumber,
  UserExists,
  validateUserInputs,
} from '../../server/utils/validators.js';

const validInput = {
  firstName: 'Alice',
  lastName: 'Smith',
  username: 'alicesmith',
  email: 'alice@example.com',
  password: 'Pass1@word',
  phoneNumber: '555-555-5555',
  country: 'USA',
};

beforeEach(() => {
  jest.resetAllMocks();
  User.findOne.mockResolvedValue(null);
});

describe('validateEmail', () => {
  test.each([
    ['user@example.com', true],
    ['user.name+tag@domain.co.uk', true],
    ['USER@EXAMPLE.COM', true],
    ['', false],
    ['notanemail', false],
    ['missing@', false],
    ['@nodomain.com', false],
    [null, false],
  ])('%p is valid: %s', (input, expectsTruthy) => {
    const result = validateEmail(input);
    if (expectsTruthy) {
      expect(result).toBeTruthy();
    } else {
      expect(result).toBeFalsy();
    }
  });
});

describe('validatePhoneNumber', () => {
  test.each([
    ['(555) 555-5555', true],
    ['5551234567', true],
    ['555-555-5555', true],
    ['555 555 5555', true],
    ['12345', false],
    ['abcdefghij', false],
    ['', false],
    ['555-55-5555', false],
  ])('%p → %s', (input, expected) => {
    expect(validatePhoneNumber(input)).toBe(expected);
  });
});

describe('UserExists', () => {
  test('returns true when User.findOne resolves with a user', async () => {
    User.findOne.mockResolvedValue({ id: 1 });
    expect(await UserExists('taken@example.com')).toBe(true);
  });

  test('returns false when User.findOne resolves with null', async () => {
    User.findOne.mockResolvedValue(null);
    expect(await UserExists('free@example.com')).toBe(false);
  });

  test('propagates database failures instead of treating an email as available', async () => {
    User.findOne.mockRejectedValue(new Error('DB error'));
    await expect(UserExists('error@example.com')).rejects.toThrow('DB error');
  });

  test('normalizes email before checking availability', async () => {
    await UserExists('  Alice@Example.COM  ');
    expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
  });
});

describe('validateUserInputs', () => {
  test('returns empty array for fully valid input', async () => {
    const errors = await validateUserInputs(validInput);
    expect(errors).toEqual([]);
  });

  test('error when firstName is empty', async () => {
    const errors = await validateUserInputs({ ...validInput, firstName: '' });
    expect(errors).toEqual(expect.arrayContaining(['first name is required']));
  });

  test('error when firstName is too short (< 3 chars)', async () => {
    const errors = await validateUserInputs({ ...validInput, firstName: 'Al' });
    expect(errors).toEqual(
      expect.arrayContaining(['The first name must be at least 4 characters long.'])
    );
  });

  test('error when firstName exceeds 64 characters', async () => {
    const errors = await validateUserInputs({ ...validInput, firstName: 'A'.repeat(65) });
    expect(errors).toEqual(
      expect.arrayContaining(['The first name must not exceed 64 characters.'])
    );
  });

  test('error when email format is invalid', async () => {
    const errors = await validateUserInputs({ ...validInput, email: 'bad-email' });
    expect(errors).toEqual(
      expect.arrayContaining(['The email address format is invalid.'])
    );
  });

  test('rejects a registered email even when the new username is available', async () => {
    User.findOne.mockImplementation(async ({ where }) => where.email ? { id: 99 } : null);
    const errors = await validateUserInputs(validInput);
    expect(errors).toEqual(['A user with this email already exists']);
  });

  test('error when password lacks required complexity', async () => {
    const errors = await validateUserInputs({ ...validInput, password: 'nouppercase1@' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Password must be at least 8 characters');
  });

  test('error when password is too short', async () => {
    const errors = await validateUserInputs({ ...validInput, password: 'Short1@' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Password must be at least 8 characters');
  });

  test('error when phone number format is invalid', async () => {
    const errors = await validateUserInputs({ ...validInput, phoneNumber: '12345' });
    expect(errors).toEqual(
      expect.arrayContaining(['The phone number format is invalid.'])
    );
  });

  test('error when country is empty', async () => {
    const errors = await validateUserInputs({ ...validInput, country: '' });
    expect(errors).toEqual(expect.arrayContaining(['Country is required.']));
  });

  test('returns at least 7 errors for completely empty input', async () => {
    const errors = await validateUserInputs({});
    expect(errors.length).toBeGreaterThanOrEqual(7);
  });
});
