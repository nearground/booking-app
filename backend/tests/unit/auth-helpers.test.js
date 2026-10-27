import jwt from 'jsonwebtoken';
import {
  getToken,
  validateToken,
  generateNewToken,
} from '../../server/utils/auth-helpers.js';

describe('JWT secret configuration', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  test.each(['', 'short-secret', ' '.repeat(32), 'your-secret-jwt-key-change-in-production'])(
    'rejects an unsafe JWT_SECRET at startup (%p)',
    (secret) => {
      process.env.JWT_SECRET = secret;
      expect(() => {
        jest.isolateModules(() => {
          require('../../server/utils/auth-helpers.js');
        });
      }).toThrow('JWT_SECRET must be a unique, randomly generated secret');
    }
  );

  test('accepts a sufficiently long non-placeholder JWT_SECRET', () => {
    expect(() => {
      jest.isolateModules(() => {
        require('../../server/utils/auth-helpers.js');
      });
    }).not.toThrow();
  });
});

describe('getToken', () => {
  test.each([
    ['Bearer abc123', 'abc123'],
    ['Bearer ', ''],
    ['Token abc123', ''],
    ['', ''],
    [undefined, ''],
    ['abc123', ''],
  ])('getToken(%p) === %p', (input, expected) => {
    expect(getToken(input)).toBe(expected);
  });
});

describe('validateToken', () => {
  let validToken;
  let expiredToken;

  beforeAll(() => {
    validToken = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    expiredToken = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
  });

  test('returns decoded payload for a valid token', () => {
    const result = validateToken(validToken);
    expect(result).toBeTruthy();
    expect(result.id).toBe(1);
  });

  test('returns false for garbage string', () => {
    expect(validateToken('garbage')).toBe(false);
  });

  test('returns false for token signed with wrong secret', () => {
    const wrongToken = jwt.sign({ id: 1 }, 'wrong-secret-that-is-also-long-enough');
    expect(validateToken(wrongToken)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(validateToken('')).toBe(false);
  });

  test('returns false for expired token', () => {
    expect(validateToken(expiredToken)).toBe(false);
  });
});

describe('generateNewToken', () => {
  test('generates a JWT with correct payload for valid user', () => {
    const token = generateNewToken({ id: 5, firstName: 'Jane', lastName: 'Doe' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(5);
    expect(decoded.name).toBe('Jane Doe');
  });

  test('throws for null user', () => {
    expect(() => generateNewToken(null)).toThrow('Invalid user object for token generation.');
  });

  test('throws for user object missing id', () => {
    expect(() => generateNewToken({ firstName: 'Jane' })).toThrow(
      'Invalid user object for token generation.'
    );
  });

  test('throws for empty object', () => {
    expect(() => generateNewToken({})).toThrow('Invalid user object for token generation.');
  });
});
