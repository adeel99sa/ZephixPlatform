/**
 * Phase 3B: Request context extraction tests.
 */
import { getRequestIp, getUserAgent } from '../../../shared/request/request-context';

describe('Request Context Helpers', () => {
  describe('getRequestIp', () => {
    it('extracts IP from X-Forwarded-For header', () => {
      const req = {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
        ip: '127.0.0.1',
      };
      expect(getRequestIp(req)).toBe('1.2.3.4');
    });

    it('falls back to req.ip when no X-Forwarded-For', () => {
      const req = { headers: {}, ip: '192.168.1.1' };
      expect(getRequestIp(req)).toBe('192.168.1.1');
    });

    it('falls back to connection.remoteAddress', () => {
      const req = { headers: {}, connection: { remoteAddress: '10.0.0.1' } };
      expect(getRequestIp(req)).toBe('10.0.0.1');
    });

    it('returns null for null request', () => {
      expect(getRequestIp(null)).toBeNull();
    });

    it('returns null for undefined request', () => {
      expect(getRequestIp(undefined)).toBeNull();
    });

    it('handles single X-Forwarded-For value', () => {
      const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, ip: '127.0.0.1' };
      expect(getRequestIp(req)).toBe('1.2.3.4');
    });
  });

  describe('getUserAgent', () => {
    it('extracts user-agent from headers', () => {
      const req = { headers: { 'user-agent': 'Mozilla/5.0 TestBrowser' } };
      expect(getUserAgent(req)).toBe('Mozilla/5.0 TestBrowser');
    });

    it('truncates user-agent to 512 chars', () => {
      const longUA = 'A'.repeat(600);
      const req = { headers: { 'user-agent': longUA } };
      expect(getUserAgent(req)?.length).toBe(512);
    });

    it('returns null when no user-agent header', () => {
      const req = { headers: {} };
      expect(getUserAgent(req)).toBeNull();
    });

    it('returns null for null request', () => {
      expect(getUserAgent(null)).toBeNull();
    });
  });
});
