process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.DEV_DB_NAME = 'test_db';
process.env.DEV_DB_USER = 'test_user';
process.env.DEV_DB_PASS = 'test_pass';
process.env.DEV_DB_HOST = '127.0.0.1';
process.env.AUTH_REGISTER_RATE_LIMIT_MAX = '1000';
process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '1000';

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
