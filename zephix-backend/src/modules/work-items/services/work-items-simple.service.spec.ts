import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WorkItemsSimpleService } from './work-items-simple.service';
import { WorkItem, WorkItemStatus } from '../entities/work-item.entity';
import { WorkItemKeyService } from '../work-item-key.service';
import { Repository } from 'typeorm';

describe('WorkItemsSimpleService', () => {
  let service: WorkItemsSimpleService;
  let repo: jest.Mocked<Repository<WorkItem>>;
  let keyService: jest.Mocked<WorkItemKeyService>;

  const mockWorkspaceId = 'workspace-1';
  const mockOrgId = 'org-1';
  const mockProjectId = 'project-1';

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockKeyService = {
      nextKey: jest.fn().mockResolvedValue('ZPX-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkItemsSimpleService,
        {
          provide: getRepositoryToken(WorkItem),
          useValue: mockRepo,
        },
        {
          provide: WorkItemKeyService,
          useValue: mockKeyService,
        },
      ],
    }).compile();

    service = module.get<WorkItemsSimpleService>(WorkItemsSimpleService);
    repo = module.get(getRepositoryToken(WorkItem));
    keyService = module.get(WorkItemKeyService);
  });

  describe('list', () => {
    it('should return only items for the given workspace and project', async () => {
      const mockItems = [
        { id: '1', workspaceId: mockWorkspaceId, projectId: mockProjectId, title: 'Item 1' },
        { id: '2', workspaceId: mockWorkspaceId, projectId: mockProjectId, title: 'Item 2' },
      ];
      repo.find.mockResolvedValue(mockItems as WorkItem[]);

      const result = await service.list(mockWorkspaceId, mockProjectId);

      expect(repo.find).toHaveBeenCalledWith({
        where: { workspaceId: mockWorkspaceId, projectId: mockProjectId, deletedAt: null },
        order: { updatedAt: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toEqual(mockItems);
    });

    it('should not return soft-deleted items', async () => {
      repo.find.mockResolvedValue([]);

      await service.list(mockWorkspaceId, mockProjectId);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a work item with defaults', async () => {
      const dto = { title: 'New Item' };
      const createdItem = {
        id: 'new-id',
        organizationId: mockOrgId,
        workspaceId: mockWorkspaceId,
        projectId: mockProjectId,
        title: 'New Item',
        status: WorkItemStatus.TODO,
      };

      repo.create.mockReturnValue(createdItem as WorkItem);
      repo.save.mockResolvedValue(createdItem as WorkItem);

      const result = await service.create(mockWorkspaceId, mockOrgId, mockProjectId, dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: mockOrgId,
          workspaceId: mockWorkspaceId,
          projectId: mockProjectId,
          title: 'New Item',
          status: WorkItemStatus.TODO,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(createdItem);
    });

    it('should trim title on create', async () => {
      const dto = { title: '  Trimmed Title  ' };
      repo.create.mockReturnValue({ title: 'Trimmed Title' } as WorkItem);
      repo.save.mockResolvedValue({ title: 'Trimmed Title' } as WorkItem);

      await service.create(mockWorkspaceId, mockOrgId, mockProjectId, dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Trimmed Title' }),
      );
    });
  });

  describe('get', () => {
    it('should return item if found', async () => {
      const mockItem = { id: 'item-1', workspaceId: mockWorkspaceId, title: 'Found' };
      repo.findOne.mockResolvedValue(mockItem as WorkItem);

      const result = await service.get(mockWorkspaceId, 'item-1');

      expect(result).toEqual(mockItem);
    });

    it('should throw NotFoundException if item not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.get(mockWorkspaceId, 'not-found')).rejects.toThrow(NotFoundException);
    });

    it('should not return soft-deleted items', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.get(mockWorkspaceId, 'item-1').catch(() => {});

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { workspaceId: mockWorkspaceId, id: 'item-1', deletedAt: null },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete the item', async () => {
      const mockItem = { id: 'item-1', workspaceId: mockWorkspaceId, deletedAt: null };
      repo.findOne.mockResolvedValue(mockItem as WorkItem);
      repo.save.mockResolvedValue({ ...mockItem, deletedAt: new Date() } as WorkItem);

      const result = await service.remove(mockWorkspaceId, 'item-1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException if item not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(mockWorkspaceId, 'not-found')).rejects.toThrow(NotFoundException);
    });
  });
});
