import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
// Namespace import: ipaddr.js is CommonJS with no default export, and the build
// tsconfig lacks esModuleInterop, so `import ipaddr from 'ipaddr.js'` resolves
// to `require(...).default` = undefined at runtime (ts-jest hid this). Caught
// live in SEC-5 Stage-2.
import * as ipaddr from 'ipaddr.js';

/**
 * SEC-5-FIX — SSRF guard for user-configured outbound URLs (integration
 * baseUrl). Closes the hole where an authenticated org user could point a Jira
 * connection at `http://redis.railway.internal:6379`, `169.254.169.254`, or any
 * internal host and have the server fetch it.
 *
 * FLOOR (assertPublicHttpUrl): enforce https, reject internal hostnames, and —
 * DNS-REBIND-SAFE — resolve the host and reject if ANY resolved address is not
 * a global-unicast (public) IP. ipaddr.js `range()` returns 'unicast' only for
 * public addresses; every private/loopback/linkLocal/uniqueLocal/reserved/
 * carrierGradeNat/multicast/etc. range (incl. 169.254.169.254 metadata) is
 * classified otherwise and blocked.
 *
 * Applied at connection creation AND before each fetch (DNS can rebind between).
 */

const BLOCKED_HOSTS = new Set(['localhost']);
const BLOCKED_HOST_SUFFIXES = ['.internal', '.local', '.localhost'];

function isDisallowedIp(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    return true; // unparseable → block
  }
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address(); // unwrap ::ffff:10.0.0.1 style
    }
  }
  return addr.range() !== 'unicast';
}

/** Throws BadRequestException if `rawUrl` is not a safe, public https URL. */
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid integration URL');
  }
  if (u.protocol !== 'https:') {
    throw new BadRequestException('Integration URL must use https');
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  if (
    BLOCKED_HOSTS.has(host) ||
    BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))
  ) {
    throw new BadRequestException(
      `Integration URL host '${host}' is not allowed`,
    );
  }

  let ips: string[];
  if (ipaddr.isValid(host)) {
    ips = [host]; // IP literal — validate directly
  } else {
    let records: { address: string }[];
    try {
      records = await dns.lookup(host, { all: true });
    } catch {
      throw new BadRequestException(
        `Integration URL host '${host}' could not be resolved`,
      );
    }
    if (records.length === 0) {
      throw new BadRequestException(
        `Integration URL host '${host}' did not resolve`,
      );
    }
    ips = records.map((r) => r.address);
  }

  for (const ip of ips) {
    if (isDisallowedIp(ip)) {
      throw new BadRequestException(
        'Integration URL resolves to a non-public (internal/reserved) address and is not allowed',
      );
    }
  }
}

const JIRA_CLOUD_SUFFIX = '.atlassian.net';

/**
 * CEILING (allowlist): a connection host must be Jira Cloud (`*.atlassian.net`)
 * or an admin-opted-in per-org self-hosted host. This is defense-in-depth over
 * the floor guard: it restricts the surface to the small, known Jira domain
 * universe. `extraHosts` comes from the org's self-hosted opt-in list.
 */
export function isAllowedIntegrationHost(
  rawUrl: string,
  extraHosts: string[] = [],
): boolean {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === 'atlassian.net' || host.endsWith(JIRA_CLOUD_SUFFIX)) {
    return true;
  }
  return extraHosts.map((h) => h.toLowerCase().trim()).includes(host);
}
