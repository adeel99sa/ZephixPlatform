/**
 * Session helper for UI acceptance tests.
 *
 * Establishes authenticated browser sessions via the smoke-login endpoint.
 * No password required — smoke-login is a staging-only bypass that requires X-Smoke-Key.
 *
 * IMPORTANT: Use smokeLoginWithPage (not smokeLoginSession) when you need the session
 * to be active in the browser for subsequent page.goto() calls.
 *
 * smokeLoginWithPage uses page.request, which is backed by the page's own browser context.
 * Cookies set via page.request go directly into the browser context's cookie store — the
 * same store the browser uses when the page's JS makes fetch requests to the backend.
 * This is the correct approach for cross-domain sessions because it avoids the
 * extract-from-APIRequestContext + addCookies dance, which can mis-scope cookie domains.
 *
 * Never prints token or key values.
 */
import { type Page, type APIRequestContext, type BrowserContext, type Cookie } from '@playwright/test';

export interface SmokeSession {
  cookies: Cookie[];
  csrfToken: string;
}

/**
 * Establish a smoke-login session using page.request.
 *
 * Cookies set by the backend response are automatically stored in the page's
 * browser context. After this call, page.goto() and all page JS fetch requests
 * to the backend domain will include the session cookie.
 *
 * @param page     Playwright Page — uses page.request so cookies land in page context
 * @param apiBase  e.g. "https://zephix-backend-staging-staging.up.railway.app/api"
 * @param email    The user email to log in as
 * @param smokeKey STAGING_SMOKE_KEY value (never logged)
 */
export async function smokeLoginWithPage(
  page: Page,
  apiBase: string,
  email: string,
  smokeKey: string,
): Promise<{ csrfToken: string }> {
  // Step 1 — CSRF token. page.request stores the response cookie in the browser context.
  const csrfResp = await page.request.get(`${apiBase}/auth/csrf`);
  if (!csrfResp.ok()) {
    throw new Error(`csrf failed: ${csrfResp.status()} for ${email}`);
  }
  const csrfBody = await csrfResp.json();
  const csrfToken: string = csrfBody.csrfToken || csrfBody.token || '';
  if (csrfToken.length < 10) {
    throw new Error(`csrf token missing or too short for ${email}`);
  }

  // Step 2 — smoke-login. Session cookie is set in the page browser context.
  const loginResp = await page.request.post(`${apiBase}/auth/smoke-login`, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'x-zephix-env': 'staging',
      'X-Smoke-Key': smokeKey,
    },
    data: { email },
  });
  if (loginResp.status() !== 204) {
    throw new Error(`smoke-login failed: status ${loginResp.status()} for ${email}`);
  }

  // Cookies are now in page.context() — no addCookies call needed.
  return { csrfToken };
}

/**
 * Establish a smoke-login session using a standalone APIRequestContext.
 * Use this only for pure API calls that do not need a browser page (e.g. entity creation
 * in beforeAll where no page fixture is available).
 *
 * Cookies from this context are NOT in any browser context. Do not use these to
 * authenticate page navigations — use smokeLoginWithPage for that instead.
 */
export async function smokeLoginSession(
  request: APIRequestContext,
  apiBase: string,
  email: string,
  smokeKey: string,
): Promise<SmokeSession> {
  const csrfResp = await request.get(`${apiBase}/auth/csrf`);
  if (!csrfResp.ok()) {
    throw new Error(`csrf failed: ${csrfResp.status()} for ${email}`);
  }
  const csrfBody = await csrfResp.json();
  const csrfToken: string = csrfBody.csrfToken || csrfBody.token || '';
  if (csrfToken.length < 10) {
    throw new Error(`csrf token missing or too short for ${email}`);
  }

  const loginResp = await request.post(`${apiBase}/auth/smoke-login`, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'x-zephix-env': 'staging',
      'X-Smoke-Key': smokeKey,
    },
    data: { email },
  });
  if (loginResp.status() !== 204) {
    throw new Error(`smoke-login failed: status ${loginResp.status()} for ${email}`);
  }

  const storageState = await request.storageState();
  return { cookies: storageState.cookies, csrfToken };
}

/**
 * Apply session cookies to a browser context.
 * Only use this with cookies from smokeLoginSession (standalone API context).
 * When using smokeLoginWithPage, cookies are already in the page context — no call needed.
 */
export async function applySessionToContext(
  context: BrowserContext,
  session: SmokeSession,
): Promise<void> {
  if (session.cookies.length === 0) {
    throw new Error('applySessionToContext: no cookies in session');
  }
  await context.addCookies(session.cookies);
}
