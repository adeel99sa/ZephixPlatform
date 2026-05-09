import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

describe('getApiErrorMessage — RBAC / Build 1 codes', () => {
  it.each([
    ['LAST_ADMIN_DEMOTE_BLOCKED', 'at least one admin'],
    ['LAST_ADMIN_DEACTIVATE_BLOCKED', 'keep at least one admin'],
    ['INVITATION_EXPIRED', 'expired'],
    ['INVITATION_INVALID', 'not valid'],
    ['INVITATION_NOT_FOUND', 'not valid'],
    ['INVITATION_ALREADY_ACCEPTED', 'already used'],
    ['MFA_INVALID_CODE', 'verification code'],
    ['MFA_ALREADY_ENROLLED', 'already enabled'],
    ['INVALID_PASSWORD', 'password is not correct'],
    ['PASSWORD_RESET_TOKEN_EXPIRED', 'reset link has expired'],
    ['PASSWORD_RESET_TOKEN_INVALID', 'not valid'],
    ['PASSWORD_RESET_TOKEN_USED', 'already used'],
    ['PASSWORD_RESET_ALREADY_USED', 'already used'],
  ] as const)('maps %s to friendly copy', (code, snippet) => {
    const msg = getApiErrorMessage({ code, message: 'Server message' });
    expect(msg.toLowerCase()).toContain(snippet);
  });

  it('falls back to short backend message', () => {
    expect(getApiErrorMessage({ code: 'UNKNOWN_X', message: 'Custom short' })).toBe('Custom short');
  });

  it('null error returns generic', () => {
    expect(getApiErrorMessage(null)).toContain('Something went wrong');
  });
});
