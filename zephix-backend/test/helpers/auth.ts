import request from 'supertest';

/**
 * Login and get session cookies for authenticated test requests.
 * Use this for e2e tests that need to authenticate before accessing endpoints.
 */
export async function loginAndGetCookie(
  app: any,
  email: string,
  password: string,
): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  // Handle both 200 and 201 responses
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed with status ${res.status}: ${res.text}`);
  }

  const setCookie = res.headers['set-cookie'];
  if (!setCookie || !Array.isArray(setCookie) || setCookie.length === 0) {
    // Some auth implementations return token in body instead of cookies
    if (res.body?.accessToken) {
      return [`access_token=${res.body.accessToken}`];
    }
    throw new Error('Missing set-cookie on login response');
  }

  return setCookie;
}

/**
 * Get auth header for Bearer token auth (alternative to cookie-based).
 */
export async function loginAndGetToken(
  app: any,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed with status ${res.status}: ${res.text}`);
  }

  if (res.body?.accessToken) {
    return res.body.accessToken;
  }

  // Try to extract from cookie
  const setCookie = res.headers['set-cookie'];
  if (setCookie && Array.isArray(setCookie)) {
    const accessCookie = setCookie.find((c: string) =>
      c.startsWith('access_token='),
    );
    if (accessCookie) {
      const match = accessCookie.match(/access_token=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
  }

  throw new Error('Could not extract access token from login response');
}

/**
 * Demo credentials for testing.
 * These should match the demo bootstrap data.
 */
export const TEST_CREDENTIALS = {
  email: 'demo@zephix.io',
  password: 'demo123!',
} as const;
