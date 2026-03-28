/**
 * Phase 3D: Error Code Consistency Tests
 */
import { ErrorCode, STATUS_TO_ERROR_CODE } from '../error-codes';
import { AppException } from '../app-exception';
import { HttpStatus } from '@nestjs/common';

describe('ErrorCode Enum', () => {
  it('contains AUTH_UNAUTHORIZED', () => {
    expect(ErrorCode.AUTH_UNAUTHORIZED).toBe('AUTH_UNAUTHORIZED');
  });

  it('contains AUTH_FORBIDDEN', () => {
    expect(ErrorCode.AUTH_FORBIDDEN).toBe('AUTH_FORBIDDEN');
  });

  it('contains ENTITLEMENT_REQUIRED', () => {
    expect(ErrorCode.ENTITLEMENT_REQUIRED).toBe('ENTITLEMENT_REQUIRED');
  });

  it('contains PLAN_INACTIVE', () => {
    expect(ErrorCode.PLAN_INACTIVE).toBe('PLAN_INACTIVE');
  });

  it('contains QUOTA_EXCEEDED', () => {
    expect(ErrorCode.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
  });

  it('contains STORAGE_LIMIT_EXCEEDED', () => {
    expect(ErrorCode.STORAGE_LIMIT_EXCEEDED).toBe('STORAGE_LIMIT_EXCEEDED');
  });

  it('contains ATTACHMENT_EXPIRED', () => {
    expect(ErrorCode.ATTACHMENT_EXPIRED).toBe('ATTACHMENT_EXPIRED');
  });

  it('contains VALIDATION_ERROR', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
  });

  it('contains RATE_LIMITED', () => {
    expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
  });

  it('contains INTERNAL_ERROR', () => {
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });

  it('contains NOT_FOUND', () => {
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
  });

  it('contains CONFLICT', () => {
    expect(ErrorCode.CONFLICT).toBe('CONFLICT');
  });

  it('contains WIP_LIMIT_EXCEEDED', () => {
    expect(ErrorCode.WIP_LIMIT_EXCEEDED).toBe('WIP_LIMIT_EXCEEDED');
  });

  it('contains BASELINE_LOCKED', () => {
    expect(ErrorCode.BASELINE_LOCKED).toBe('BASELINE_LOCKED');
  });
});

describe('STATUS_TO_ERROR_CODE mapping', () => {
  it('maps 400 to VALIDATION_ERROR', () => {
    expect(STATUS_TO_ERROR_CODE[400]).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('maps 401 to AUTH_UNAUTHORIZED', () => {
    expect(STATUS_TO_ERROR_CODE[401]).toBe(ErrorCode.AUTH_UNAUTHORIZED);
  });

  it('maps 403 to AUTH_FORBIDDEN', () => {
    expect(STATUS_TO_ERROR_CODE[403]).toBe(ErrorCode.AUTH_FORBIDDEN);
  });

  it('maps 404 to NOT_FOUND', () => {
    expect(STATUS_TO_ERROR_CODE[404]).toBe(ErrorCode.NOT_FOUND);
  });

  it('maps 409 to CONFLICT', () => {
    expect(STATUS_TO_ERROR_CODE[409]).toBe(ErrorCode.CONFLICT);
  });

  it('maps 410 to ATTACHMENT_EXPIRED', () => {
    expect(STATUS_TO_ERROR_CODE[410]).toBe(ErrorCode.ATTACHMENT_EXPIRED);
  });

  it('maps 429 to RATE_LIMITED', () => {
    expect(STATUS_TO_ERROR_CODE[429]).toBe(ErrorCode.RATE_LIMITED);
  });

  it('maps 500 to INTERNAL_ERROR', () => {
    expect(STATUS_TO_ERROR_CODE[500]).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('maps 503 to SERVICE_UNAVAILABLE', () => {
    expect(STATUS_TO_ERROR_CODE[503]).toBe(ErrorCode.SERVICE_UNAVAILABLE);
  });
});

describe('AppException', () => {
  it('creates exception with code and message', () => {
    const ex = new AppException(ErrorCode.QUOTA_EXCEEDED, 'Limit reached', 403);
    expect(ex.getStatus()).toBe(403);
    const resp = ex.getResponse() as any;
    expect(resp.code).toBe('QUOTA_EXCEEDED');
    expect(resp.message).toBe('Limit reached');
  });

  it('includes metadata in response', () => {
    const ex = new AppException(
      ErrorCode.STORAGE_LIMIT_EXCEEDED,
      'Storage full',
      403,
      { usedBytes: 1000, limitBytes: 500 },
    );
    const resp = ex.getResponse() as any;
    expect(resp.code).toBe('STORAGE_LIMIT_EXCEEDED');
    expect(resp.usedBytes).toBe(1000);
    expect(resp.limitBytes).toBe(500);
  });

  it('defaults to 500 status when not specified', () => {
    const ex = new AppException(ErrorCode.INTERNAL_ERROR, 'Unexpected');
    expect(ex.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('extends HttpException', () => {
    const ex = new AppException(ErrorCode.NOT_FOUND, 'Missing', 404);
    expect(ex).toBeInstanceOf(AppException);
  });
});
