jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

import { sendNotification } from '../../server/services/Notification.service.js';
import nodemailer from 'nodemailer';

const SMTP_BASE_ENV = {
  NOTIFICATIONS_FROM_EMAIL: 'from@example.com',
  SPACEMAIL_HOST: 'smtp.example.com',
};

let mockSendMail;

beforeEach(() => {
  jest.resetAllMocks();
  mockSendMail = jest.fn().mockResolvedValue({});
  nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

  delete process.env.NOTIFICATIONS_PROVIDER;
  delete process.env.NOTIFICATIONS_FROM_EMAIL;
  delete process.env.SPACEMAIL_HOST;
  delete process.env.RESEND_API_KEY;
});

describe('sendNotification', () => {
  test('console provider returns sent:true', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'console';
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result).toEqual({ sent: true, provider: 'console' });
  });

  test('disabled provider returns sent:false', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'disabled';
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result).toEqual({ sent: false, provider: 'disabled' });
  });

  test('unknown provider falls back to console', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'bogus';
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result).toEqual({ sent: true, provider: 'console' });
  });

  test('smtp without FROM_EMAIL returns missing_from_email', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'smtp';
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result).toEqual({ sent: false, provider: 'smtp', reason: 'missing_from_email' });
  });

  test('smtp with FROM_EMAIL but no HOST returns missing_host', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'smtp';
    process.env.NOTIFICATIONS_FROM_EMAIL = SMTP_BASE_ENV.NOTIFICATIONS_FROM_EMAIL;
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result).toEqual({ sent: false, provider: 'smtp', reason: 'missing_host' });
  });

  test('smtp with valid config and successful send returns sent:true', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'smtp';
    process.env.NOTIFICATIONS_FROM_EMAIL = SMTP_BASE_ENV.NOTIFICATIONS_FROM_EMAIL;
    process.env.SPACEMAIL_HOST = SMTP_BASE_ENV.SPACEMAIL_HOST;
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result).toEqual({ sent: true, provider: 'smtp' });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test('smtp send failure returns sent:false with reason and masked email', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'smtp';
    process.env.NOTIFICATIONS_FROM_EMAIL = SMTP_BASE_ENV.NOTIFICATIONS_FROM_EMAIL;
    process.env.SPACEMAIL_HOST = SMTP_BASE_ENV.SPACEMAIL_HOST;
    const failSend = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    nodemailer.createTransport.mockReturnValueOnce({ sendMail: failSend });
    const result = await sendNotification({ template: 'test', to: 'user@b.com', payload: {} });
    expect(result.sent).toBe(false);
    expect(result.provider).toBe('smtp');
    expect(result.reason).toBe('ECONNREFUSED');
    expect(result.to).toBe('us**@b.com');
  });

  test('resend without API key returns missing_api_key', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'resend';
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result).toEqual({ sent: false, provider: 'resend', reason: 'missing_api_key' });
  });

  test('resend with API key returns not_implemented', async () => {
    process.env.NOTIFICATIONS_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'key123';
    const result = await sendNotification({ template: 'test', to: 'a@b.com', payload: {} });
    expect(result.sent).toBe(false);
    expect(result.provider).toBe('resend');
    expect(result.reason).toBe('not_implemented');
  });
});
