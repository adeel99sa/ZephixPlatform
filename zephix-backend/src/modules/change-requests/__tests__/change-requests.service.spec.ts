import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChangeRequestsService, ActorContext } from '../services/change-requests.service';
import { ChangeRequestEntity } from '../entities/change-request.entity';
import {
  ChangeRequestImpactScope,
  ChangeRequestStatus,
} from '../types/change-request.enums';

describe('ChangeRequestsService', () => {
  let service: ChangeRequestsService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  const wsId = 'ws-1';
  const projId = 'proj-1';
  const ownerActor: ActorContext = { userId: 'user-1', workspaceRole: 'OWNER' };
  const memberActor: ActorContext = { userId: 'user-2', workspaceRole: 'MEMBER' };

  const makeRow = (overrides: Partial<ChangeRequestEntity> = {}): ChangeRequestEntity =>
    ({
      id: 'cr-1',
      workspaceId: wsId,
      projectId: projId,
      title: 'Test CR',
      description: null,
      reason: null,
      impactScope: ChangeRequestImpactScope.SCOPE,
      impactCost: null,
      impactDays: null,
      status: ChangeRequestStatus.DRAFT,
      createdByUserId: 'user-1',
      approvedByUserId: null,
      approvedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      implementedByUserId: null,
      implementedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ChangeRequestEntity;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'cr-1', ...data })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeRequestsService,
        { provide: getRepositoryToken(ChangeRequestEntity), useValue: repo },
      ],
    }).compile();

    service = module.get(ChangeRequestsService);
  });

  // ── create ──
  describe('create', () => {
    it('creates a change request with DRAFT status by default', async () => {
      const dto = {
        title: 'Add extra sprint',
        impactScope: ChangeRequestImpactScope.SCHEDULE,
      };
      const result = await service.create(wsId, projId, dto as any, ownerActor);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: wsId,
          projectId: projId,
          title: 'Add extra sprint',
          status: ChangeRequestStatus.DRAFT,
          createdByUserId: 'user-1',
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ── update ──
  describe('update', () => {
    it('allows update when status is DRAFT', async () => {
      const row = makeRow();
      repo.findOne.mockResolvedValue(row);

      await service.update(wsId, projId, 'cr-1', { title: 'Updated' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated' }),
      );
    });

    it('rejects update when status is not DRAFT', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await expect(
        service.update(wsId, projId, 'cr-1', { title: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── submit ──
  describe('submit', () => {
    it('transitions from DRAFT to SUBMITTED', async () => {
      const row = makeRow();
      repo.findOne.mockResolvedValue(row);

      await service.submit(wsId, projId, 'cr-1');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ChangeRequestStatus.SUBMITTED }),
      );
    });

    it('rejects submit when not DRAFT', async () => {
      const row = makeRow({ status: ChangeRequestStatus.APPROVED });
      repo.findOne.mockResolvedValue(row);

      await expect(service.submit(wsId, projId, 'cr-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── approve ──
  describe('approve', () => {
    it('allows OWNER to approve a SUBMITTED request', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await service.approve(wsId, projId, 'cr-1', ownerActor);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.APPROVED,
          approvedByUserId: 'user-1',
        }),
      );
    });

    it('rejects approval from MEMBER role', async () => {
      await expect(
        service.approve(wsId, projId, 'cr-1', memberActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects approval when not SUBMITTED', async () => {
      const row = makeRow({ status: ChangeRequestStatus.DRAFT });
      repo.findOne.mockResolvedValue(row);

      await expect(
        service.approve(wsId, projId, 'cr-1', ownerActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── reject ──
  describe('reject', () => {
    it('allows OWNER to reject and stores reason', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await service.reject(wsId, projId, 'cr-1', ownerActor, { reason: 'Too expensive' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.REJECTED,
          rejectedByUserId: 'user-1',
          rejectionReason: 'Too expensive',
        }),
      );
    });

    it('rejects rejection from MEMBER role', async () => {
      await expect(
        service.reject(wsId, projId, 'cr-1', memberActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── implement ──
  describe('implement', () => {
    it('transitions from APPROVED to IMPLEMENTED', async () => {
      const row = makeRow({ status: ChangeRequestStatus.APPROVED });
      repo.findOne.mockResolvedValue(row);

      await service.implement(wsId, projId, 'cr-1', ownerActor);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ChangeRequestStatus.IMPLEMENTED,
          implementedByUserId: 'user-1',
        }),
      );
    });

    it('rejects implement when not APPROVED', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await expect(
        service.implement(wsId, projId, 'cr-1', ownerActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove ──
  describe('remove', () => {
    it('allows delete when DRAFT', async () => {
      const row = makeRow();
      repo.findOne.mockResolvedValue(row);

      const result = await service.remove(wsId, projId, 'cr-1');
      expect(result).toEqual({ deleted: true });
      expect(repo.delete).toHaveBeenCalledWith({
        id: 'cr-1',
        workspaceId: wsId,
        projectId: projId,
      });
    });

    it('rejects delete when not DRAFT', async () => {
      const row = makeRow({ status: ChangeRequestStatus.SUBMITTED });
      repo.findOne.mockResolvedValue(row);

      await expect(service.remove(wsId, projId, 'cr-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── get ──
  describe('get', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.get(wsId, projId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
