import {
  assertPublicHttpUrl,
  isAllowedIntegrationHost,
} from './ssrf-guard';

describe('assertPublicHttpUrl (SEC-5-FIX SSRF guard)', () => {
  const rejects = async (url: string) =>
    expect(assertPublicHttpUrl(url)).rejects.toThrow();
  const accepts = async (url: string) =>
    expect(assertPublicHttpUrl(url)).resolves.toBeUndefined();

  it('rejects non-https', () => rejects('http://8.8.8.8/'));
  it('rejects localhost', () => rejects('https://localhost/'));
  it('rejects *.internal hosts (Railway internal net)', () =>
    rejects('https://redis.railway.internal:6379/'));
  it('rejects the cloud metadata IP', () =>
    rejects('https://169.254.169.254/'));
  it('rejects RFC1918 private ranges', async () => {
    await rejects('https://10.0.0.5/');
    await rejects('https://192.168.1.10/');
    await rejects('https://172.16.0.1/');
  });
  it('rejects loopback (v4 + v6)', async () => {
    await rejects('https://127.0.0.1/');
    await rejects('https://[::1]/');
  });
  it('rejects IPv4-mapped IPv6 loopback', () =>
    rejects('https://[::ffff:127.0.0.1]/'));
  it('rejects an invalid URL', () => rejects('not-a-url'));
  it('accepts a public https IP literal (no DNS)', () =>
    accepts('https://8.8.8.8/rest/api/3/myself'));
});

describe('isAllowedIntegrationHost (SEC-5-FIX allowlist)', () => {
  it('allows Jira Cloud', () => {
    expect(isAllowedIntegrationHost('https://acme.atlassian.net/x')).toBe(true);
    expect(isAllowedIntegrationHost('https://atlassian.net/x')).toBe(true);
  });
  it('rejects arbitrary hosts not opted in', () => {
    expect(isAllowedIntegrationHost('https://evil.example.com/')).toBe(false);
    expect(isAllowedIntegrationHost('https://8.8.8.8/')).toBe(false);
  });
  it('allows a per-org opted-in self-hosted host', () => {
    expect(
      isAllowedIntegrationHost('https://jira.acme.com/', ['jira.acme.com']),
    ).toBe(true);
  });
  it('is case-insensitive and does not allow lookalikes', () => {
    expect(isAllowedIntegrationHost('https://ACME.Atlassian.net/')).toBe(true);
    expect(isAllowedIntegrationHost('https://atlassian.net.evil.com/')).toBe(
      false,
    );
  });
});
