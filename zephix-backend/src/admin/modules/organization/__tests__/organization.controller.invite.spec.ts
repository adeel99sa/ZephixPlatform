import { ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OrganizationAdminController } from '../organization.controller';
import { OrgInvitesService } from '../../../../modules/auth/services/org-invites.service';
import { JwtAuthGuard } from '../../../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../guards/admin.guard';

describe('OrganizationAdminController invite endpoint', () => {
  let app: INestApplication;
  const invitesServiceMock = {
    adminInviteWithWorkspaces: jest.fn(),
  };

  const authGuard = {
    canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'admin-user-1',
        organizationId: 'org-1',
        platformRole: 'ADMIN',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationAdminController],
      providers: [
        {
          provide: OrgInvitesService,
          useValue: invitesServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports happy-path invite with Admin role and workspace assignments', async () => {
    invitesServiceMock.adminInviteWithWorkspaces.mockResolvedValue([
      { email: 'newadmin@example.com', status: 'success', message: 'Invitation sent' },
    ]);

    await request(app.getHttpServer())
      .post('/admin/organization/users/invite')
      .send({
        emails: ['newadmin@example.com'],
        platformRole: 'Admin',
        workspaceAssignments: [
          { workspaceId: '550e8400-e29b-41d4-a716-446655440000', accessLevel: 'Member' },
        ],
      })
      .expect(201);

    expect(invitesServiceMock.adminInviteWithWorkspaces).toHaveBeenCalledWith(
      'org-1',
      ['newadmin@example.com'],
      'Admin',
      [{ workspaceId: '550e8400-e29b-41d4-a716-446655440000', accessLevel: 'Member' }],
      'admin-user-1',
      expect.anything(),
    );
  });

  it('returns 403 when service rejects with forbidden', async () => {
    invitesServiceMock.adminInviteWithWorkspaces.mockRejectedValue(
      new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Only organization admins can invite users',
      }),
    );

    await request(app.getHttpServer())
      .post('/admin/organization/users/invite')
      .send({
        emails: ['blocked@example.com'],
        platformRole: 'Admin',
      })
      .expect(403);
  });

  it('returns 400 for invalid payload shape', async () => {
    await request(app.getHttpServer())
      .post('/admin/organization/users/invite')
      .send({
        emails: 'not-an-array',
        platformRole: 'Admin',
      })
      .expect(400);
  });

  it('always scopes invite call to authenticated organization', async () => {
    invitesServiceMock.adminInviteWithWorkspaces.mockResolvedValue([
      { email: 'scopecheck@example.com', status: 'success' },
    ]);

    await request(app.getHttpServer())
      .post('/admin/organization/users/invite')
      .send({
        emails: ['scopecheck@example.com'],
        platformRole: 'Member',
      })
      .expect(201);

    const firstArg = invitesServiceMock.adminInviteWithWorkspaces.mock.calls[0][0];
    expect(firstArg).toBe('org-1');
  });
});
