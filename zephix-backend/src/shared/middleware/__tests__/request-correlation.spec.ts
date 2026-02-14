/**
 * Phase 3D: Request Correlation ID Tests
 */
import { RequestCorrelationMiddleware, getRequestId } from '../request-correlation.middleware';

describe('RequestCorrelationMiddleware', () => {
  let middleware: RequestCorrelationMiddleware;

  beforeEach(() => {
    middleware = new RequestCorrelationMiddleware();
  });

  it('generates a UUID when no X-Request-Id header is present', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.requestId).toBeDefined();
    expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('propagates client-sent X-Request-Id', () => {
    const req: any = { headers: { 'x-request-id': 'client-123' } };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBe('client-123');
    expect(req.requestId).toBe('client-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-123');
  });

  it('attaches id and requestId to request object', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBe(req.requestId);
  });

  it('calls next() to continue middleware chain', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('getRequestId helper', () => {
  it('extracts id from request', () => {
    expect(getRequestId({ id: 'abc' })).toBe('abc');
  });

  it('extracts requestId from request', () => {
    expect(getRequestId({ requestId: 'def' })).toBe('def');
  });

  it('extracts from headers', () => {
    expect(getRequestId({ headers: { 'x-request-id': 'ghi' } })).toBe('ghi');
  });

  it('returns "unknown" when nothing available', () => {
    expect(getRequestId({})).toBe('unknown');
    expect(getRequestId(null)).toBe('unknown');
    expect(getRequestId(undefined)).toBe('unknown');
  });
});
