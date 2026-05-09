import { describe, it, expect } from 'vitest';

import { getApiErrorMessage } from '@/utils/apiErrorMessage';

describe('getApiErrorMessage — Build 2 tenancy codes', () => {
  it('MAX_USERS_LIMIT_EXCEEDED interpolates limit', () => {
    expect(
      getApiErrorMessage({ code: 'MAX_USERS_LIMIT_EXCEEDED', limit: 10, message: 'x' }),
    ).toContain('10');
    expect(getApiErrorMessage({ code: 'MAX_USERS_LIMIT_EXCEEDED', message: 'x' })).toContain(
      'limited number',
    );
  });

  it('MAX_WORKSPACES_LIMIT_EXCEEDED interpolates limit', () => {
    expect(
      getApiErrorMessage({ code: 'MAX_WORKSPACES_LIMIT_EXCEEDED', limit: 2, message: 'x' }),
    ).toContain('2');
    expect(getApiErrorMessage({ code: 'MAX_WORKSPACES_LIMIT_EXCEEDED', message: 'x' })).toContain(
      'limited number',
    );
  });

  it('WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY', () => {
    expect(getApiErrorMessage({ code: 'WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY' })).toContain(
      'Organization Admins',
    );
  });

  it('PROGRAMS_NOT_AVAILABLE_FOR_TIER', () => {
    expect(getApiErrorMessage({ code: 'PROGRAMS_NOT_AVAILABLE_FOR_TIER' })).toContain('Governed');
  });
});
