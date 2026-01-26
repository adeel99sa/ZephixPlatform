import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrgInvitesService } from './org-invites.service';
import { OrgInvite } from '../entities/org-invite.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';

// Mock TokenHashUtil
jest.mock('../../../common/security/token-hash.util', () => ({
  TokenHashUtil: {
    generateRawToken: jest.fn(() => 'mock-raw-token-uuid-v4'),
    hashToken: jest.fn((token: string) => {
      // Deterministic hash for testing
      if (token === 'mock-raw-token-uuid-v4') {
        return 'mock-token-hash-64-chars-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      }
      return `hash-of-${token}`;
    }),
  },
}));

describe('OrgInvitesService', () => {
  let service: OrgInvitesService;
  let inviteRepository: jest.Mocked<Repository<OrgInvite>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let userOrgRepository: jest.Mocked<Repository<UserOrganization>>;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let dataSource: jest.Mocked<DataSource>;
  let mockTransactionManager: any;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';
  const mockInviteId = 'invite-123';
  const mockTokenHash = 'mock-token-hash-64-chars-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  beforeEach(async () => {
    // Setup transaction manager mock
    mockTransactionManager = {
      getRepository: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    // Setup DataSource mock
    dataSource = {
      transaction: jest.fn((callback: any) => callback(mockTransactionManager)),
    } as any;

    // Setup repository mocks
    inviteRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    userRepository = {
      findOne: jest.fn(),
    } as any;

    userOrgRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    organizationRepository = {
      findOne: jest.fn(),
    } as any;

    // Setup transaction manager repositories
    mockTransactionManager.getRepository.mockImplementation((entity: any) => {
      if (entity === User) {
        return {
          create: jest.fn(),
          save: jest.fn(),
        };
      }
      if (entity === UserOrganization) {
        return {
          create: jest.fn(),
          save: jest.fn(),
        };
      }
      if (entity === OrgInvite) {
        return {
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
          })),
          save: jest.fn(),
        };
      }
      return {};
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgInvitesService,
        {
          provide: getRepositoryToken(OrgInvite),
          useValue: inviteRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: userOrgRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<OrgInvitesService>(OrgInvitesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvite', () => {
    const ctx = {
      organizationId: mockOrgId,
      userId: mockUserId,
      platformRole: 'ADMIN',
    };

    const dto = {
      email: 'test@example.com',
      role: 'member' as const,
    };

    it('should reject when user already exists in org', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'existing-user-id',
        email: 'test@example.com',
        organizationId: mockOrgId,
      } as User);

      let error: any;
      try {
        await service.createInvite(ctx, dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.response.code).toBe('ORG_USER_ALREADY_EXISTS');
    });

    it('should update existing active invite and return new inviteLink (idempotent re-invite)', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Create dto with 'admin' role to test update
      const updateDto = {
        email: 'test@example.com',
        role: 'admin' as const,
      };

      const existingInvite = {
        id: mockInviteId,
        organizationId: mockOrgId,
        email: 'test@example.com',
        role: 'member', // Original role
        tokenHash: 'old-token-hash',
        invitedByUserId: 'old-user-id',
        acceptedAt: null,
        revokedAt: null,
        expiresAt: futureDate,
      } as OrgInvite;

      const updatedInvite = {
        ...existingInvite,
        tokenHash: 'new-token-hash',
        role: 'admin',
        invitedByUserId: ctx.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as OrgInvite;

      inviteRepository.findOne.mockResolvedValue(existingInvite as OrgInvite);
      
      // Mock save to return the invite passed to it (service modifies existingInvite in place)
      inviteRepository.save.mockImplementation((invite) => {
        // Service modifies the invite object in place, so return it as-is
        return Promise.resolve(invite as OrgInvite);
      });

      const result = await service.createInvite(ctx, updateDto);

      // Verify result has updated values (service updates existing invite)
      expect(result.id).toBe(mockInviteId);
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('admin'); // Updated from 'member' to 'admin' (dto.role)
      expect(result.inviteLink).toContain('token=');
      expect(inviteRepository.save).toHaveBeenCalledTimes(1);
      
      // Verify the saved invite has updated fields
      const savedInvite = inviteRepository.save.mock.calls[0][0] as OrgInvite;
      expect(savedInvite.id).toBe(mockInviteId);
      expect(savedInvite.role).toBe('admin'); // Should be updated to dto.role
      expect(savedInvite.invitedByUserId).toBe(ctx.userId); // Should be updated
      expect(savedInvite.tokenHash).toBeDefined();
      expect(savedInvite.tokenHash).not.toBe('old-token-hash'); // Should be new hash
      expect(savedInvite.expiresAt).toBeInstanceOf(Date);
      
      // Verify the original existingInvite object was modified (same reference)
      expect(existingInvite.role).toBe('admin');
      expect(existingInvite.invitedByUserId).toBe(ctx.userId);
    });

    it('should create invite successfully when no conflicts', async () => {
      userRepository.findOne.mockResolvedValue(null);
      inviteRepository.findOne.mockResolvedValue(null);

      const savedInvite = {
        id: mockInviteId,
        email: 'test@example.com',
        role: 'member',
        expiresAt: new Date(),
      };

      inviteRepository.create.mockReturnValue(savedInvite as OrgInvite);
      inviteRepository.save.mockResolvedValue(savedInvite as OrgInvite);

      const result = await service.createInvite(ctx, dto);

      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('member');
      expect(result.inviteLink).toContain('/accept-invite?token=');
      expect(result.inviteLink).toContain('mock-raw-token-uuid-v4');
      expect(TokenHashUtil.hashToken).toHaveBeenCalled();
    });

    it('should reject when platformRole is not ADMIN', async () => {
      const nonAdminCtx = {
        ...ctx,
        platformRole: 'MEMBER',
      };

      let error: any;
      try {
        await service.createInvite(nonAdminCtx, dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.response.code).toBe('FORBIDDEN');
    });
  });

  describe('validateInviteToken', () => {
    const dto = {
      token: 'mock-raw-token-uuid-v4',
    };

    it('should return 404 for unknown token', async () => {
      inviteRepository.findOne.mockResolvedValue(null);

      let error: any;
      try {
        await service.validateInviteToken(dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.response.code).toBe('ORG_INVITE_NOT_FOUND');
    });

    it('should return 404 for expired invite', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      inviteRepository.findOne.mockResolvedValue({
        id: mockInviteId,
        tokenHash: mockTokenHash,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: pastDate,
        organizationId: mockOrgId,
      } as OrgInvite);

      let error: any;
      try {
        await service.validateInviteToken(dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.response.code).toBe('ORG_INVITE_NOT_FOUND');
    });

    it('should return 404 for revoked invite', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      inviteRepository.findOne.mockResolvedValue({
        id: mockInviteId,
        tokenHash: mockTokenHash,
        acceptedAt: null,
        revokedAt: new Date(),
        expiresAt: futureDate,
        organizationId: mockOrgId,
      } as OrgInvite);

      let error: any;
      try {
        await service.validateInviteToken(dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.response.code).toBe('ORG_INVITE_NOT_FOUND');
    });

    it('should return 404 for already accepted invite', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      inviteRepository.findOne.mockResolvedValue({
        id: mockInviteId,
        tokenHash: mockTokenHash,
        acceptedAt: new Date(),
        revokedAt: null,
        expiresAt: futureDate,
        organizationId: mockOrgId,
      } as OrgInvite);

      let error: any;
      try {
        await service.validateInviteToken(dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.response.code).toBe('ORG_INVITE_NOT_FOUND');
    });

    it('should return safe details for valid active invite', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      inviteRepository.findOne.mockResolvedValue({
        id: mockInviteId,
        tokenHash: mockTokenHash,
        email: 'test@example.com',
        role: 'member',
        acceptedAt: null,
        revokedAt: null,
        expiresAt: futureDate,
        organizationId: mockOrgId,
      } as OrgInvite);

      organizationRepository.findOne.mockResolvedValue({
        id: mockOrgId,
        name: 'Test Organization',
      } as Organization);

      const result = await service.validateInviteToken(dto);

      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('member');
      expect(result.orgName).toBe('Test Organization');
      expect(result.expiresAt).toEqual(futureDate);
    });
  });

  describe('acceptInvite', () => {
    const dto = {
      token: 'mock-raw-token-uuid-v4',
      fullName: 'John Doe',
      password: 'Password123!',
    };

    it('should create UserOrganization with role pm when invite role is member', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invite = {
        id: mockInviteId,
        tokenHash: mockTokenHash,
        email: 'test@example.com',
        role: 'member',
        organizationId: mockOrgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: futureDate,
      };

      inviteRepository.findOne.mockResolvedValue(invite as OrgInvite);
      userRepository.findOne.mockResolvedValue(null);

      const mockUserRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      };
      const mockUserOrgRepo = {
        create: jest.fn(),
        save: jest.fn(),
      };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      };
      const mockInviteRepo = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
        save: jest.fn(),
      };

      mockTransactionManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepo;
        if (entity === UserOrganization) return mockUserOrgRepo;
        if (entity === OrgInvite) return mockInviteRepo;
        return {};
      });

      const savedUser = {
        id: 'new-user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        organizationId: mockOrgId,
      };

      const savedUserOrg = {
        id: 'user-org-id',
        userId: 'new-user-id',
        organizationId: mockOrgId,
        role: 'pm',
      };

      mockQueryBuilder.getOne.mockResolvedValue(invite as OrgInvite);
      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);
      mockUserOrgRepo.create.mockReturnValue(savedUserOrg);
      mockUserOrgRepo.save.mockResolvedValue(savedUserOrg);
      mockInviteRepo.save.mockResolvedValue({
        ...invite,
        acceptedAt: new Date(),
      });

      const result = await service.acceptInvite(dto);

      expect(result.userId).toBe('new-user-id');
      expect(result.organizationId).toBe(mockOrgId);

      // Verify UserOrganization was created with role 'pm'
      expect(mockUserOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'pm',
        }),
      );
    });

    it('should mark invite acceptedAt and prevent second accept', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invite = {
        id: mockInviteId,
        tokenHash: mockTokenHash,
        email: 'test@example.com',
        role: 'admin',
        organizationId: mockOrgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: futureDate,
      };

      inviteRepository.findOne.mockResolvedValue(invite as OrgInvite);
      userRepository.findOne.mockResolvedValue(null);

      const mockUserRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      };
      const mockUserOrgRepo = {
        create: jest.fn(),
        save: jest.fn(),
      };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      };
      const mockInviteRepo = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
        save: jest.fn(),
      };

      mockTransactionManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepo;
        if (entity === UserOrganization) return mockUserOrgRepo;
        if (entity === OrgInvite) return mockInviteRepo;
        return {};
      });

      const savedUser = {
        id: 'new-user-id',
        email: 'test@example.com',
      };

      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);
      mockUserOrgRepo.create.mockReturnValue({});
      mockUserOrgRepo.save.mockResolvedValue({});
      mockQueryBuilder.getOne.mockResolvedValueOnce(invite as OrgInvite); // First call succeeds
      mockInviteRepo.save.mockResolvedValue({
        ...invite,
        acceptedAt: new Date(),
      });

      // First accept should succeed
      await service.acceptInvite(dto);

      // Second accept should fail - locked query returns null because invite already accepted
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Locked query finds nothing (already accepted)

      let error: any;
      try {
        await service.acceptInvite(dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.response.code).toBe('ORG_INVITE_NOT_FOUND');
    });

    it('should throw ORG_INVITE_NOT_FOUND when locked query returns null', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Outer repo returns null (invite not found)
      inviteRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      const mockUserRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      };
      const mockUserOrgRepo = {
        create: jest.fn(),
        save: jest.fn(),
      };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      };
      const mockInviteRepo = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
        save: jest.fn(),
      };

      mockTransactionManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepo;
        if (entity === UserOrganization) return mockUserOrgRepo;
        if (entity === OrgInvite) return mockInviteRepo;
        return {};
      });

      // Locked query also returns null (authoritative check fails)
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue(null); // No existing user (not reached but needed for mock)

      let error: any;
      try {
        await service.acceptInvite(dto);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.response.code).toBe('ORG_INVITE_NOT_FOUND');
      expect(error.response.message).toBe('Invite not found or invalid');
    });

    it('should create UserOrganization with role admin when invite role is admin', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invite = {
        id: mockInviteId,
        tokenHash: mockTokenHash,
        email: 'test@example.com',
        role: 'admin',
        organizationId: mockOrgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: futureDate,
      };

      inviteRepository.findOne.mockResolvedValue(invite as OrgInvite);
      userRepository.findOne.mockResolvedValue(null);

      const mockUserRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      };
      const mockUserOrgRepo = {
        create: jest.fn(),
        save: jest.fn(),
      };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      };
      const mockInviteRepo = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
        save: jest.fn(),
      };

      mockTransactionManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepo;
        if (entity === UserOrganization) return mockUserOrgRepo;
        if (entity === OrgInvite) return mockInviteRepo;
        return {};
      });

      const savedUser = { id: 'new-user-id' };
      mockQueryBuilder.getOne.mockResolvedValue(invite as OrgInvite);
      mockUserRepo.findOne.mockResolvedValue(null); // No existing user
      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);
      mockUserOrgRepo.create.mockReturnValue({});
      mockUserOrgRepo.save.mockResolvedValue({});
      mockInviteRepo.save.mockResolvedValue({ ...invite, acceptedAt: new Date() });

      const result = await service.acceptInvite(dto);

      expect(result.userId).toBe('new-user-id');
      expect(result.organizationId).toBe(mockOrgId);
      expect(mockUserOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        }),
      );
    });

    it('should create UserOrganization with role viewer when invite role is viewer', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invite = {
        id: mockInviteId,
        tokenHash: mockTokenHash,
        email: 'test@example.com',
        role: 'viewer',
        organizationId: mockOrgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: futureDate,
      };

      inviteRepository.findOne.mockResolvedValue(invite as OrgInvite);
      userRepository.findOne.mockResolvedValue(null);

      const mockUserRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      };
      const mockUserOrgRepo = {
        create: jest.fn(),
        save: jest.fn(),
      };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      };
      const mockInviteRepo = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
        save: jest.fn(),
      };

      mockTransactionManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepo;
        if (entity === UserOrganization) return mockUserOrgRepo;
        if (entity === OrgInvite) return mockInviteRepo;
        return {};
      });

      const savedUser = { id: 'new-user-id' };
      mockQueryBuilder.getOne.mockResolvedValue(invite as OrgInvite);
      mockUserRepo.findOne.mockResolvedValue(null); // No existing user
      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);
      mockUserOrgRepo.create.mockReturnValue({});
      mockUserOrgRepo.save.mockResolvedValue({});
      mockInviteRepo.save.mockResolvedValue({ ...invite, acceptedAt: new Date() });

      const result = await service.acceptInvite(dto);

      expect(result.userId).toBe('new-user-id');
      expect(result.organizationId).toBe(mockOrgId);
      expect(mockUserOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'viewer',
        }),
      );
    });
  });
});
