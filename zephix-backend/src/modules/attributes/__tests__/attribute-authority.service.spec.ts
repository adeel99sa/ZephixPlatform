import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import {
  AttributeDefinition,
  AttributeScope,
  AttributeDataType,
} from '../entities/attribute-definition.entity';
import { TemplateAttributeDefinition } from '../entities/template-attribute-definition.entity';
import { AttributeAuthorityService } from '../services/attribute-authority.service';

const mockWorkspaceMemberRepo = () => ({
  findOne: jest.fn(),
});

const makeDef = (scope: AttributeScope): AttributeDefinition =>
  ({
    id: 'def-1',
    scope,
    organizationId: scope === AttributeScope.SYSTEM ? null : 'org-1',
    workspaceId: scope === AttributeScope.WORKSPACE ? 'ws-1' : null,
    dataType: AttributeDataType.TEXT,
    locked: false,
  }) as AttributeDefinition;

const wsOwnerMember = {
  userId: 'user-1',
  workspaceId: 'ws-1',
  organizationId: 'org-1',
  role: 'workspace_owner',
};

describe('AttributeAuthorityService', () => {
  let service: () => AttributeAuthorityService;
  let memberRepo: ReturnType<typeof mockWorkspaceMemberRepo>;

  beforeEach(async () => {
    memberRepo = mockWorkspaceMemberRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributeAuthorityService,
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: memberRepo,
        },
      ],
    }).compile();

    // 52-checklist: lazy getter — never pass app/service by value at describe-time
    service = () => module.get<AttributeAuthorityService>(AttributeAuthorityService);
  });

  describe('assertCanMutate — SYSTEM scope', () => {
    it('always throws ATTRIBUTE_SYSTEM_IMMUTABLE', async () => {
      const def = makeDef(AttributeScope.SYSTEM);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'admin',
        }),
      ).rejects.toMatchObject({ response: { code: 'ATTRIBUTE_SYSTEM_IMMUTABLE' } });
    });
  });

  describe('assertCanMutate — ORG scope', () => {
    it('org-admin succeeds', async () => {
      const def = makeDef(AttributeScope.ORG);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'admin',
        }),
      ).resolves.toBeUndefined();
    });

    it('member throws ATTRIBUTE_LOCKED_BY_HIGHER_TIER', async () => {
      const def = makeDef(AttributeScope.ORG);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'member',
        }),
      ).rejects.toMatchObject({
        response: { code: 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER' },
      });
    });

    it('workspace_owner (non-admin org role) throws ATTRIBUTE_LOCKED_BY_HIGHER_TIER', async () => {
      const def = makeDef(AttributeScope.ORG);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'member', // org role — ws-owner has 'member' org role
          wsId: 'ws-1',
        }),
      ).rejects.toMatchObject({
        response: { code: 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER' },
      });
    });
  });

  describe('assertCanMutate — WORKSPACE scope', () => {
    it('org-admin succeeds without wsId (short-circuits before DB lookup)', async () => {
      const def = makeDef(AttributeScope.WORKSPACE);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'admin',
          wsId: 'ws-1',
        }),
      ).resolves.toBeUndefined();
      expect(memberRepo.findOne).not.toHaveBeenCalled();
    });

    it('workspace_owner succeeds', async () => {
      memberRepo.findOne.mockResolvedValue(wsOwnerMember);
      const def = makeDef(AttributeScope.WORKSPACE);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'member',
          wsId: 'ws-1',
        }),
      ).resolves.toBeUndefined();
    });

    it('workspace_member (non-owner) throws', async () => {
      memberRepo.findOne.mockResolvedValue({ ...wsOwnerMember, role: 'workspace_member' });
      const def = makeDef(AttributeScope.WORKSPACE);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'member',
          wsId: 'ws-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('non-member (findOne returns null) throws', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      const def = makeDef(AttributeScope.WORKSPACE);
      await expect(
        service().assertCanMutate(def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'member',
          wsId: 'ws-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assertCanDetach — locked attachment', () => {
    it('locked attachment + org-admin → succeeds', async () => {
      const def = makeDef(AttributeScope.ORG);
      const attachment = { locked: true } as TemplateAttributeDefinition;
      await expect(
        service().assertCanDetach(attachment, def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'admin',
        }),
      ).resolves.toBeUndefined();
    });

    it('locked attachment + ws-owner (ORG-scoped def) → 403', async () => {
      const def = makeDef(AttributeScope.ORG);
      const attachment = { locked: true } as TemplateAttributeDefinition;
      await expect(
        service().assertCanDetach(attachment, def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'member',
          wsId: 'ws-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('unlocked attachment + any role → passes (no authority check)', async () => {
      const def = makeDef(AttributeScope.ORG);
      const attachment = { locked: false } as TemplateAttributeDefinition;
      // unlocked: assertCanDetach skips assertCanMutate entirely
      await expect(
        service().assertCanDetach(attachment, def, {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'member',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
