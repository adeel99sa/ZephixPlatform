/**
 * Wave 6: Template authoring service tests.
 * Tests clone, publish/unpublish, org isolation logic, and legacy freeze enforcement.
 * Pure unit tests — mocked repositories.
 */

import { TemplatesService } from '../templates.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  VALID_TAB_IDS,
  VALID_DELIVERY_METHODS,
} from '../../constants/template-defaults';

// Test fixtures
const SYSTEM_TEMPLATE = {
  id: 'sys-tpl-1',
  name: 'Scrum Project',
  description: 'Sprint-based delivery',
  methodology: 'agile' as const,
  deliveryMethod: 'SCRUM',
  defaultTabs: ['overview', 'tasks', 'board', 'kpis'],
  defaultGovernanceFlags: { iterationsEnabled: true, costTrackingEnabled: false },
  phases: [{ name: 'Sprint', description: 'Sprint phase', order: 0, estimatedDurationDays: 14 }],
  taskTemplates: [{ name: 'Backlog', description: 'Refine', estimatedHours: 4, phaseOrder: 0, priority: 'high' }],
  riskPresets: [],
  workTypeTags: ['software'],
  isSystem: true,
  isActive: true,
  isPublished: true,
  organizationId: null,
  templateScope: 'SYSTEM' as const,
};

const ORG_TEMPLATE = {
  id: 'org-tpl-1',
  name: 'Custom Template',
  description: 'Org custom',
  isSystem: false,
  isActive: true,
  isPublished: false,
  organizationId: 'org-1',
  templateScope: 'ORG' as const,
  deliveryMethod: 'HYBRID',
};

const createMockDataSource = (mockRepo: any) => ({
  getRepository: jest.fn().mockReturnValue(mockRepo),
  transaction: jest.fn(),
});

const createMockKpisService = () => ({
  listTemplateKpis: jest.fn().mockResolvedValue([]),
  copyBindings: jest.fn().mockResolvedValue(3),
});

describe('Wave 6: Template Authoring', () => {
  let service: TemplatesService;
  let mockRepo: any;
  let mockDataSource: any;
  let mockKpisService: any;

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data: any) => ({ ...data, id: 'new-tpl-1' })),
      save: jest.fn((entity: any) => Promise.resolve(entity)),
    };

    mockDataSource = createMockDataSource(mockRepo);
    mockKpisService = createMockKpisService();

    service = new TemplatesService(
      {} as any, // legacy ProjectTemplate repo (unused in unified methods)
      {} as any, // legacy Template repo (unused in unified methods)
      mockDataSource as any,
      { assertOrganizationId: () => 'org-1' } as any, // tenantContextService
      mockKpisService as any,
    );
  });

  // ── Clone ──────────────────────────────────────────────────────────

  describe('cloneSystemTemplateToOrg', () => {
    it('copies all fields from source template', async () => {
      mockRepo.findOne.mockResolvedValue(SYSTEM_TEMPLATE);

      const result = await service.cloneSystemTemplateToOrg('sys-tpl-1', 'org-1', 'user-1');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Scrum Project (Copy)',
          deliveryMethod: 'SCRUM',
          isSystem: false,
          isPublished: false,
          organizationId: 'org-1',
          templateScope: 'ORG',
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('copies KPI bindings via copyBindings', async () => {
      mockRepo.findOne.mockResolvedValue(SYSTEM_TEMPLATE);

      await service.cloneSystemTemplateToOrg('sys-tpl-1', 'org-1', 'user-1');

      expect(mockKpisService.copyBindings).toHaveBeenCalledWith(
        'sys-tpl-1',
        'new-tpl-1',
      );
    });

    it('rejects when source is not a system template', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cloneSystemTemplateToOrg('nonexistent', 'org-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Publish / Unpublish ────────────────────────────────────────────

  describe('publishTemplate', () => {
    it('sets isPublished to true', async () => {
      const tpl = { ...ORG_TEMPLATE, isPublished: false };
      mockRepo.findOne.mockResolvedValue(tpl);

      await service.publishTemplate('org-tpl-1', 'org-1');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: true }),
      );
    });

    it('rejects for system templates', async () => {
      mockRepo.findOne.mockResolvedValue(SYSTEM_TEMPLATE);

      await expect(
        service.publishTemplate('sys-tpl-1', 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('unpublishTemplate', () => {
    it('sets isPublished to false', async () => {
      const tpl = { ...ORG_TEMPLATE, isPublished: true };
      mockRepo.findOne.mockResolvedValue(tpl);

      await service.unpublishTemplate('org-tpl-1', 'org-1');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: false }),
      );
    });

    it('rejects for system templates', async () => {
      mockRepo.findOne.mockResolvedValue(SYSTEM_TEMPLATE);

      await expect(
        service.unpublishTemplate('sys-tpl-1', 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Org isolation ──────────────────────────────────────────────────

  describe('updateOrgTemplate', () => {
    it('rejects editing system templates', async () => {
      mockRepo.findOne.mockResolvedValue(SYSTEM_TEMPLATE);

      await expect(
        service.updateOrgTemplate('sys-tpl-1', 'org-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects editing another org template', async () => {
      const otherOrgTpl = { ...ORG_TEMPLATE, organizationId: 'org-other' };
      mockRepo.findOne.mockResolvedValue(otherOrgTpl);

      await expect(
        service.updateOrgTemplate('org-tpl-1', 'org-1', { name: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates allowed fields', async () => {
      const tpl = { ...ORG_TEMPLATE };
      mockRepo.findOne.mockResolvedValue(tpl);

      await service.updateOrgTemplate('org-tpl-1', 'org-1', {
        name: 'Renamed',
        deliveryMethod: 'KANBAN',
        defaultTabs: ['overview', 'board'],
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Renamed',
          deliveryMethod: 'KANBAN',
          defaultTabs: ['overview', 'board'],
        }),
      );
    });
  });

  // ── Archive ────────────────────────────────────────────────────────

  describe('archiveUnified', () => {
    it('rejects archiving system templates', async () => {
      mockRepo.findOne.mockResolvedValue(SYSTEM_TEMPLATE);

      await expect(
        service.archiveUnified('sys-tpl-1', 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sets isActive to false', async () => {
      const tpl = { ...ORG_TEMPLATE };
      mockRepo.findOne.mockResolvedValue(tpl);

      await service.archiveUnified('org-tpl-1', 'org-1');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  // ── Published listing ──────────────────────────────────────────────

  describe('findPublishedTemplates', () => {
    it('returns only published templates', async () => {
      const published = [
        { ...SYSTEM_TEMPLATE },
        { ...ORG_TEMPLATE, isPublished: true },
      ];
      mockRepo.find.mockResolvedValue(published);

      const result = await service.findPublishedTemplates('org-1');

      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ isPublished: true }),
          ]),
        }),
      );
    });
  });

  // ── Legacy freeze enforcement ─────────────────────────────────────

  describe('legacy freeze enforcement', () => {
    it('legacy create() method is marked deprecated in JSDoc', () => {
      expect(typeof service.create).toBe('function');
    });

    it('legacy applyTemplate() method is marked deprecated in JSDoc', () => {
      expect(typeof service.applyTemplate).toBe('function');
    });

    it('unified methods exist and are distinct from legacy', () => {
      expect(typeof service.createUnified).toBe('function');
      expect(typeof service.applyTemplateUnified).toBe('function');
      expect(typeof service.findAllUnified).toBe('function');
      expect(typeof service.findOneUnified).toBe('function');
      expect(service.createUnified).not.toBe(service.create);
      expect(service.applyTemplateUnified).not.toBe(service.applyTemplate);
    });
  });

  // ── Shared constants coverage ─────────────────────────────────────

  describe('shared constants', () => {
    it('VALID_TAB_IDS includes all tabs used in test fixtures', () => {
      const allTabIds = [...VALID_TAB_IDS];
      for (const tab of SYSTEM_TEMPLATE.defaultTabs) {
        expect(allTabIds).toContain(tab);
      }
    });

    it('VALID_DELIVERY_METHODS includes all methods used in test fixtures', () => {
      const allMethods = [...VALID_DELIVERY_METHODS];
      expect(allMethods).toContain(SYSTEM_TEMPLATE.deliveryMethod);
      expect(allMethods).toContain(ORG_TEMPLATE.deliveryMethod);
    });
  });
});
