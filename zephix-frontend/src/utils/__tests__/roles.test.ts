/**
 * Unit tests for normalizePlatformRole and platformRoleFromUser
 */
import { describe, it, expect } from 'vitest';
import { normalizePlatformRole, platformRoleFromUser } from '../roles';

describe('normalizePlatformRole', () => {
  it('maps manager → MEMBER', () => {
    expect(normalizePlatformRole('manager')).toBe('MEMBER');
  });

  it('maps MANAGER (uppercase) → MEMBER', () => {
    expect(normalizePlatformRole('MANAGER')).toBe('MEMBER');
  });

  it('maps lowercase admin → ADMIN', () => {
    expect(normalizePlatformRole('admin')).toBe('ADMIN');
  });

  it('maps uppercase ADMIN → ADMIN', () => {
    expect(normalizePlatformRole('ADMIN')).toBe('ADMIN');
  });

  it('maps owner → ADMIN', () => {
    expect(normalizePlatformRole('owner')).toBe('ADMIN');
  });

  it('maps member → MEMBER', () => {
    expect(normalizePlatformRole('member')).toBe('MEMBER');
  });

  it('maps pm → MEMBER', () => {
    expect(normalizePlatformRole('pm')).toBe('MEMBER');
  });

  it('maps project_manager → MEMBER', () => {
    expect(normalizePlatformRole('project_manager')).toBe('MEMBER');
  });

  it('maps guest → VIEWER', () => {
    expect(normalizePlatformRole('guest')).toBe('VIEWER');
  });

  it('maps viewer → VIEWER', () => {
    expect(normalizePlatformRole('viewer')).toBe('VIEWER');
  });

  it('maps unknown role → VIEWER', () => {
    expect(normalizePlatformRole('unknown_role')).toBe('VIEWER');
  });

  it('maps undefined → VIEWER', () => {
    expect(normalizePlatformRole(undefined)).toBe('VIEWER');
  });

  it('maps null → VIEWER', () => {
    expect(normalizePlatformRole(null)).toBe('VIEWER');
  });

  it('maps empty string → VIEWER', () => {
    expect(normalizePlatformRole('')).toBe('VIEWER');
  });
});

describe('platformRoleFromUser', () => {
  it('uses platformRole when present', () => {
    expect(platformRoleFromUser({ platformRole: 'ADMIN', role: 'member' })).toBe('ADMIN');
  });

  it('falls back to role when platformRole is absent', () => {
    expect(platformRoleFromUser({ role: 'manager' })).toBe('MEMBER');
  });

  it('falls back to authStoreRole when both platformRole and role are absent', () => {
    expect(platformRoleFromUser({}, 'manager')).toBe('MEMBER');
  });

  it('returns VIEWER for null user', () => {
    expect(platformRoleFromUser(null)).toBe('VIEWER');
  });

  it('normalizes legacy manager role from user.role → MEMBER', () => {
    expect(platformRoleFromUser({ role: 'manager' })).toBe('MEMBER');
  });

  it('normalizes legacy admin role from user.platformRole → ADMIN', () => {
    expect(platformRoleFromUser({ platformRole: 'admin' })).toBe('ADMIN');
  });
});
