import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentsService } from '../services/documents.service';
import { DocumentEntity } from '../entities/document.entity';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  const wsId = 'ws-1';
  const projId = 'proj-1';
  const userId = 'user-1';

  const makeDoc = (overrides: Partial<DocumentEntity> = {}): DocumentEntity =>
    ({
      id: 'doc-1',
      workspaceId: wsId,
      projectId: projId,
      title: 'Test Doc',
      content: {},
      version: 1,
      createdByUserId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as DocumentEntity;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) =>
        Promise.resolve({ id: 'doc-1', ...data }),
      ),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(DocumentEntity), useValue: repo },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  // ── create ──
  describe('create', () => {
    it('sets version to 1 on create', async () => {
      const result = await service.create(wsId, projId, { title: 'New Doc' }, userId);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: wsId,
          projectId: projId,
          title: 'New Doc',
          content: {},
          version: 1,
          createdByUserId: userId,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('accepts custom content', async () => {
      const content = { blocks: [{ type: 'paragraph', text: 'Hello' }] };
      await service.create(wsId, projId, { title: 'Rich Doc', content }, userId);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ content }),
      );
    });
  });

  // ── update ──
  describe('update', () => {
    it('increments version on update', async () => {
      const doc = makeDoc({ version: 3 });
      repo.findOne.mockResolvedValue(doc);

      await service.update(wsId, projId, 'doc-1', { title: 'Updated' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ version: 4, title: 'Updated' }),
      );
    });

    it('increments version even when only content changes', async () => {
      const doc = makeDoc({ version: 1 });
      repo.findOne.mockResolvedValue(doc);

      await service.update(wsId, projId, 'doc-1', {
        content: { updated: true },
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2, content: { updated: true } }),
      );
    });
  });

  // ── remove ──
  describe('remove', () => {
    it('deletes a document', async () => {
      const doc = makeDoc();
      repo.findOne.mockResolvedValue(doc);

      const result = await service.remove(wsId, projId, 'doc-1');
      expect(result).toEqual({ deleted: true });
      expect(repo.delete).toHaveBeenCalledWith({
        id: 'doc-1',
        workspaceId: wsId,
        projectId: projId,
      });
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

  // ── list ──
  describe('list', () => {
    it('returns documents ordered by updatedAt DESC', async () => {
      const docs = [makeDoc({ id: 'd-1' }), makeDoc({ id: 'd-2' })];
      repo.find.mockResolvedValue(docs);

      const result = await service.list(wsId, projId);
      expect(repo.find).toHaveBeenCalledWith({
        where: { workspaceId: wsId, projectId: projId },
        order: { updatedAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });
});
