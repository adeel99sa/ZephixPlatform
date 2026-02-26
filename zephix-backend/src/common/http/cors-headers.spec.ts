import { CORS_ALLOWED_HEADERS } from './cors-headers';

describe('CORS_ALLOWED_HEADERS', () => {
  it('includes lowercase x-correlation-id', () => {
    expect(CORS_ALLOWED_HEADERS).toContain('x-correlation-id');
  });

  it('includes uppercase X-Correlation-Id', () => {
    expect(CORS_ALLOWED_HEADERS).toContain('X-Correlation-Id');
  });
});
import { buildCorsAllowedHeaders } from './cors-headers';

describe('buildCorsAllowedHeaders', () => {
  it('includes required CSRF header variants', () => {
    const headers = buildCorsAllowedHeaders().map(h => h.toLowerCase());
    expect(headers).toContain('x-csrf-token');
    expect(headers).toContain('x-xsrf-token');
  });

  it('includes baseline required headers', () => {
    const headers = buildCorsAllowedHeaders().map(h => h.toLowerCase());
    expect(headers).toContain('content-type');
    expect(headers).toContain('authorization');
    expect(headers).toContain('x-request-id');
  });
});

