import { UnauthorizedException } from '@nestjs/common';
import { getAuthContext } from './get-auth-context';
import { AuthRequest } from './auth-request';

describe('getAuthContext', () => {
  it('should throw UnauthorizedException when user is missing', () => {
    const req = {} as AuthRequest;

    expect(() => getAuthContext(req)).toThrow(UnauthorizedException);
    expect(() => getAuthContext(req)).toThrow('Missing user');
  });

  it('should throw UnauthorizedException when user.id is missing', () => {
    const req = {
      user: {
        email: 'test@example.com',
      },
    } as AuthRequest;

    expect(() => getAuthContext(req)).toThrow(UnauthorizedException);
    expect(() => getAuthContext(req)).toThrow('Missing user');
  });

  it('should return userId and organizationId when user is present', () => {
    const req = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-456',
        workspaceId: 'workspace-789',
        role: 'admin',
        platformRole: 'ADMIN',
        roles: ['admin', 'member'],
      },
    } as AuthRequest;

    const context = getAuthContext(req);

    expect(context.userId).toBe('user-123');
    expect(context.organizationId).toBe('org-456');
    expect(context.workspaceId).toBe('workspace-789');
    expect(context.email).toBe('test@example.com');
    expect(context.platformRole).toBe('ADMIN');
    expect(context.roles).toEqual(['admin', 'member']);
  });

  it('should return empty roles array when roles are not provided', () => {
    const req = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    } as AuthRequest;

    const context = getAuthContext(req);

    expect(context.roles).toEqual([]);
  });

  it('should fallback to role when platformRole is not provided', () => {
    const req = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      },
    } as AuthRequest;

    const context = getAuthContext(req);

    expect(context.platformRole).toBe('admin');
  });
});

