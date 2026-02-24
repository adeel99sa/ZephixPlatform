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

