import { sendError } from '../../server/utils/http-response.js';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('sendError', () => {
  test('uses default status 500 and message when no options provided', () => {
    const res = mockRes();
    sendError(res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      errors: ['Request failed'],
      data: {},
    });
  });

  test('uses provided status and message', () => {
    const res = mockRes();
    sendError(res, { status: 400, message: 'Bad input' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: ['Bad input'],
      data: {},
    });
  });

  test('includes requestId in data when provided', () => {
    const res = mockRes();
    sendError(res, { requestId: 'req-123' });
    const { data } = res.json.mock.calls[0][0];
    expect(data.requestId).toBe('req-123');
  });

  test('does not include requestId key when requestId is undefined', () => {
    const res = mockRes();
    sendError(res, { requestId: undefined });
    const { data } = res.json.mock.calls[0][0];
    expect(data).not.toHaveProperty('requestId');
  });

  test('merges custom data with requestId', () => {
    const res = mockRes();
    sendError(res, { data: { userId: 7 }, requestId: 'x' });
    const { data } = res.json.mock.calls[0][0];
    expect(data).toEqual({ userId: 7, requestId: 'x' });
  });

  test('returns the return value of res.json()', () => {
    const res = mockRes();
    res.json = jest.fn().mockReturnValue('sentinel');
    res.status = jest.fn().mockReturnValue(res);
    const result = sendError(res);
    expect(result).toBe('sentinel');
  });
});
