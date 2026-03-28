/**
 * Phase 3D: ApiErrorFilter Tests — Error code consistency
 */
import { ApiErrorFilter } from '../api-error.filter';
import { HttpException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppException } from '../../errors/app-exception';
import { ErrorCode } from '../../errors/error-codes';

describe('ApiErrorFilter', () => {
  let filter: ApiErrorFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    const headers: Record<string, any> = {};
    let statusCode: number;
    let body: any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((b: any) => { body = b; }),
      setHeader: jest.fn((k: string, v: any) => { headers[k] = v; }),
      _body: () => body,
      _headers: () => headers,
    };
    mockRequest = {
      id: 'req-test-123',
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: {},
      user: { id: 'u1', organizationId: 'org-1' },
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
    filter = new ApiErrorFilter();
  });

  it('always includes code in error response', () => {
    filter.catch(new ForbiddenException('Denied'), mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBeDefined();
    expect(typeof body.code).toBe('string');
  });

  it('maps 403 to AUTH_FORBIDDEN', () => {
    filter.catch(new ForbiddenException('Denied'), mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe('AUTH_FORBIDDEN');
  });

  it('maps 404 to NOT_FOUND', () => {
    filter.catch(new NotFoundException('Gone'), mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe('NOT_FOUND');
  });

  it('preserves explicit code from AppException', () => {
    const err = new AppException(ErrorCode.QUOTA_EXCEEDED, 'Over limit', 403);
    filter.catch(err, mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe('QUOTA_EXCEEDED');
  });

  it('includes metadata from AppException', () => {
    const err = new AppException(
      ErrorCode.STORAGE_LIMIT_EXCEEDED,
      'Full',
      403,
      { usedBytes: 100, limitBytes: 50 },
    );
    filter.catch(err, mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.usedBytes).toBe(100);
    expect(body.limitBytes).toBe(50);
  });

  it('sets X-Request-Id header from request.id', () => {
    filter.catch(new ForbiddenException('test'), mockHost);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-test-123');
  });

  it('handles unknown errors as INTERNAL_ERROR', () => {
    filter.catch(new Error('unexpected'), mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('maps 429 to RATE_LIMITED', () => {
    const err = new HttpException('Too many', 429);
    filter.catch(err, mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe('RATE_LIMITED');
  });

  it('includes message in error response', () => {
    filter.catch(new ForbiddenException('Custom message'), mockHost);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });
});
