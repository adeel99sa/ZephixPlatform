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

  it('includes both x-org-id (short) and x-organization-id (long) header forms', () => {
    // Frontend api.ts/client.ts interceptors send 'x-organization-id' (long
    // form); useApi.ts / IntakeFormsPage / AISuggestionsPage / TeamPage /
    // ReportsPage send 'X-Org-Id' (short form). Backend reads short form in
    // organization.guard.ts / rate-limiter.guard.ts. Both must be allowed
    // through CORS preflight or staging breaks. See WS-CORS-FIX-X-ORG-ID-HEADER.
    const headers = buildCorsAllowedHeaders().map(h => h.toLowerCase());
    expect(headers).toContain('x-org-id');
    expect(headers).toContain('x-organization-id');
  });
});

