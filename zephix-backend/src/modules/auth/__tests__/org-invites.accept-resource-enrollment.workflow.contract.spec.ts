import { OrgInvitesService } from '../services/org-invites.service';
import { OrgInvite } from '../entities/org-invite.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';

describe('OrgInvitesService workflow contract', () => {
  beforeEach(() => {
    jest.spyOn(TokenHashUtil, 'hashToken').mockReturnValue('hashed-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('member invite acceptance auto-enrolls resource profile', async () => {
    const organizationRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'org-1',
        name: 'Org One',
        settings: {
          identity: {
            allowedEmailDomain: 'zephix.dev',
          },
        },
      }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'member@zephix.dev',
      }),
    };
    const userOrgRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const inviteRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'invite-1',
        orgId: 'org-1',
        email: 'member@zephix.dev',
        role: 'pm',
        isAccepted: () => false,
        isExpired: () => false,
      }),
    };
    const assignmentRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const authOutboxRepository = {};
    const workspaceRepository = {
      findOne: jest.fn(),
    };
    const workspaceMemberRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((value) => value),
    };
    const inviteRepoInTx = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    const userOrgRepoInTx = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === OrgInvite) {
              return inviteRepoInTx;
            }
            if (entity === UserOrganization) {
              return userOrgRepoInTx;
            }
            return null;
          },
        }),
      ),
    };
    const notificationDispatch = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };
    const resourceProfileFoundationService = {
      ensureForOrganizationMember: jest.fn().mockResolvedValue({ id: 'resource-1' }),
    };

    const service = new OrgInvitesService(
      organizationRepository as any,
      userRepository as any,
      userOrgRepository as any,
      inviteRepository as any,
      assignmentRepository as any,
      authOutboxRepository as any,
      workspaceRepository as any,
      workspaceMemberRepository as any,
      dataSource as any,
      notificationDispatch as any,
      resourceProfileFoundationService as any,
    );

    const result = await service.acceptInvite({
      rawToken: 'raw-token',
      userId: 'user-1',
    });

    expect(result).toEqual({ orgId: 'org-1' });
    expect(resourceProfileFoundationService.ensureForOrganizationMember).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'user-1',
      orgRole: 'pm',
    });
  });
});
