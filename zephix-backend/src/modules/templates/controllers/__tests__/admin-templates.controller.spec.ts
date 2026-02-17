/**
 * Wave 6: AdminTemplatesController test suite.
 * Covers role gating, org isolation, DTO shape, and endpoint delegation.
 * Pure unit tests — all dependencies mocked.
 */

import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AdminTemplatesController } from '../templates.controller';
import { TemplatesService } from '../../services/templates.service';

// ── Fixtures ──────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: 'user-admin-1',
  organizationId: 'org-1',
  role: 'admin',
  email: 'admin@test.com',
};

const MEMBER_USER = {
  id: 'user-member-1',
  organizationId: 'org-1',
  role: 'member',
  email: 'member@test.com',
};

const SYSTEM_TEMPLATE = {
  id: 'sys-tpl-1',
  name: 'Scrum Project',
  description: 'Sprint-based delivery',
  deliveryMethod: 'SCRUM',
  isSystem: true,
  isActive: true,
  isPublished: true,
  organizationId: null,
  templateScope: 'SYSTEM',
  boundKpiCount: 5,
};

const ORG_TEMPLATE = {
  id: 'org-tpl-1',
  name: 'Custom Template',
  description: 'Org custom',
  deliveryMethod: 'HYBRID',
  isSystem: false,
  isActive: true,
  isPublished: false,
  organizationId: 'org-1',
  templateScope: 'ORG',
  boundKpiCount: 3,
};

const CLONED_TEMPLATE = {
  ...ORG_TEMPLATE,
  id: 'org-tpl-clone-1',
  name: 'Scrum Project (Copy)',
};

const MOCK_PROJECT = {
  id: 'project-1',
  name: 'Test Project',
  workspaceId: 'ws-1',
};

// ── Mock factories ────────────────────────────────────────────────────

function createMockTemplatesService(): Record<string, jest.Mock> {
  return {
    findAllUnified: jest.fn().mockResolvedValue([SYSTEM_TEMPLATE, ORG_TEMPLATE]),
    findOneUnified: jest.fn().mockResolvedValue(ORG_TEMPLATE),
    createUnified: jest.fn().mockResolvedValue(ORG_TEMPLATE),
    cloneSystemTemplateToOrg: jest.fn().mockResolvedValue(CLONED_TEMPLATE),
    publishTemplate: jest.fn().mockResolvedValue({ ...ORG_TEMPLATE, isPublished: true }),
    unpublishTemplate: jest.fn().mockResolvedValue({ ...ORG_TEMPLATE, isPublished: false }),
    updateOrgTemplate: jest.fn().mockResolvedValue({ ...ORG_TEMPLATE, name: 'Updated' }),
    applyTemplateUnified: jest.fn().mockResolvedValue(MOCK_PROJECT),
    archiveUnified: jest.fn().mockResolvedValue(undefined),
  };
}

// ── Test suite ────────────────────────────────────────────────────────

describe('AdminTemplatesController (Wave 6)', () => {
  let controller: AdminTemplatesController;
  let service: Record<string, jest.Mock>;
  let mockDataSource: any;

  beforeEach(() => {
    service = createMockTemplatesService();
    mockDataSource = {};
    controller = new AdminTemplatesController(
      service as unknown as TemplatesService,
      mockDataSource,
    );
  });

  // ── GET /admin/templates ──────────────────────────────────────────

  describe('findAll', () => {
    it('delegates to findAllUnified with organizationId', async () => {
      const result = await controller.findAll(ADMIN_USER);

      expect(service.findAllUnified).toHaveBeenCalledWith('org-1');
      expect(result).toEqual([SYSTEM_TEMPLATE, ORG_TEMPLATE]);
    });

    it('returns enriched templates with deliveryMethod and boundKpiCount', async () => {
      const result = await controller.findAll(ADMIN_USER);

      expect(result[0]).toHaveProperty('deliveryMethod', 'SCRUM');
      expect(result[0]).toHaveProperty('boundKpiCount', 5);
      expect(result[1]).toHaveProperty('deliveryMethod', 'HYBRID');
    });
  });

  // ── GET /admin/templates/:id ──────────────────────────────────────

  describe('findOne', () => {
    it('delegates to findOneUnified with id and organizationId', async () => {
      const result = await controller.findOne('org-tpl-1', ADMIN_USER);

      expect(service.findOneUnified).toHaveBeenCalledWith('org-tpl-1', 'org-1');
      expect(result).toEqual(ORG_TEMPLATE);
    });

    it('propagates NotFoundException when template not found', async () => {
      service.findOneUnified.mockRejectedValue(
        new NotFoundException('Template not found'),
      );

      await expect(controller.findOne('bad-id', ADMIN_USER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── POST /admin/templates ─────────────────────────────────────────

  describe('create', () => {
    it('delegates to createUnified and wraps in { data }', async () => {
      const dto = { name: 'New Template', description: 'A new one' } as any;
      const result = await controller.create(dto, ADMIN_USER);

      expect(service.createUnified).toHaveBeenCalledWith(dto, 'user-admin-1', 'org-1');
      expect(result).toEqual({ data: ORG_TEMPLATE });
    });
  });

  // ── POST /admin/templates/:id/clone ───────────────────────────────

  describe('clone', () => {
    it('delegates to cloneSystemTemplateToOrg', async () => {
      const result = await controller.clone('sys-tpl-1', ADMIN_USER);

      expect(service.cloneSystemTemplateToOrg).toHaveBeenCalledWith(
        'sys-tpl-1',
        'org-1',
        'user-admin-1',
      );
      expect(result).toEqual(CLONED_TEMPLATE);
    });

    it('propagates NotFoundException for non-existent system template', async () => {
      service.cloneSystemTemplateToOrg.mockRejectedValue(
        new NotFoundException('System template not found'),
      );

      await expect(controller.clone('bad-id', ADMIN_USER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── POST /admin/templates/:id/publish ─────────────────────────────

  describe('publish', () => {
    it('delegates to publishTemplate', async () => {
      const result = await controller.publish('org-tpl-1', ADMIN_USER);

      expect(service.publishTemplate).toHaveBeenCalledWith('org-tpl-1', 'org-1');
      expect(result).toEqual(expect.objectContaining({ isPublished: true }));
    });

    it('propagates ForbiddenException for system templates', async () => {
      service.publishTemplate.mockRejectedValue(
        new ForbiddenException('System templates are always published'),
      );

      await expect(controller.publish('sys-tpl-1', ADMIN_USER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── POST /admin/templates/:id/unpublish ───────────────────────────

  describe('unpublish', () => {
    it('delegates to unpublishTemplate', async () => {
      const result = await controller.unpublish('org-tpl-1', ADMIN_USER);

      expect(service.unpublishTemplate).toHaveBeenCalledWith('org-tpl-1', 'org-1');
      expect(result).toEqual(expect.objectContaining({ isPublished: false }));
    });

    it('propagates ForbiddenException for system templates', async () => {
      service.unpublishTemplate.mockRejectedValue(
        new ForbiddenException('Cannot unpublish system templates'),
      );

      await expect(controller.unpublish('sys-tpl-1', ADMIN_USER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── PATCH /admin/templates/:id ────────────────────────────────────

  describe('update', () => {
    it('delegates to updateOrgTemplate with patch DTO', async () => {
      const dto = { name: 'Updated', deliveryMethod: 'KANBAN' };
      const result = await controller.update('org-tpl-1', dto as any, ADMIN_USER);

      expect(service.updateOrgTemplate).toHaveBeenCalledWith('org-tpl-1', 'org-1', dto);
      expect(result).toEqual(expect.objectContaining({ name: 'Updated' }));
    });

    it('propagates ForbiddenException when editing system template', async () => {
      service.updateOrgTemplate.mockRejectedValue(
        new ForbiddenException('Cannot edit system templates'),
      );

      await expect(
        controller.update('sys-tpl-1', { name: 'Hacked' } as any, ADMIN_USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('propagates ForbiddenException for cross-org edits', async () => {
      service.updateOrgTemplate.mockRejectedValue(
        new ForbiddenException('Cannot edit templates from other organizations'),
      );

      await expect(
        controller.update('org-tpl-1', { name: 'Cross-org' } as any, {
          ...ADMIN_USER,
          organizationId: 'org-other',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── POST /admin/templates/:id/apply ───────────────────────────────

  describe('applyTemplate', () => {
    const mockReq = { headers: { 'x-request-id': 'req-1' } } as any;

    it('delegates to applyTemplateUnified and returns project data', async () => {
      const dto = { name: 'Test Project', workspaceId: 'ws-1' };
      const result = await controller.applyTemplate(
        'org-tpl-1',
        dto as any,
        ADMIN_USER,
        mockReq,
      );

      expect(service.applyTemplateUnified).toHaveBeenCalledWith(
        'org-tpl-1',
        expect.objectContaining({ name: 'Test Project', workspaceId: 'ws-1' }),
        'org-1',
        'user-admin-1',
      );
      expect(result).toEqual({
        id: 'project-1',
        name: 'Test Project',
        workspaceId: 'ws-1',
      });
    });

    it('throws BadRequestException when workspaceId missing', async () => {
      const dto = { name: 'Test', workspaceId: '' };

      await expect(
        controller.applyTemplate('org-tpl-1', dto as any, ADMIN_USER, mockReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when name missing', async () => {
      const dto = { name: '', workspaceId: 'ws-1' };

      await expect(
        controller.applyTemplate('org-tpl-1', dto as any, ADMIN_USER, mockReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when organizationId missing', async () => {
      const userNoOrg = { ...ADMIN_USER, organizationId: '' };
      const dto = { name: 'Test', workspaceId: 'ws-1' };

      await expect(
        controller.applyTemplate('org-tpl-1', dto as any, userNoOrg, mockReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates NotFoundException from service', async () => {
      service.applyTemplateUnified.mockRejectedValue(
        new NotFoundException('Template not found'),
      );

      const dto = { name: 'Test', workspaceId: 'ws-1' };
      await expect(
        controller.applyTemplate('bad-id', dto as any, ADMIN_USER, mockReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('wraps unexpected errors as TEMPLATE_APPLY_FAILED', async () => {
      service.applyTemplateUnified.mockRejectedValue(new Error('DB crash'));

      const dto = { name: 'Test', workspaceId: 'ws-1' };
      await expect(
        controller.applyTemplate('org-tpl-1', dto as any, ADMIN_USER, mockReq),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── DELETE /admin/templates/:id ───────────────────────────────────

  describe('archive', () => {
    it('delegates to archiveUnified', async () => {
      await controller.archive('org-tpl-1', ADMIN_USER);

      expect(service.archiveUnified).toHaveBeenCalledWith('org-tpl-1', 'org-1');
    });

    it('propagates ForbiddenException for system templates', async () => {
      service.archiveUnified.mockRejectedValue(
        new ForbiddenException('Cannot archive system templates'),
      );

      await expect(controller.archive('sys-tpl-1', ADMIN_USER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── Org isolation ─────────────────────────────────────────────────

  describe('org isolation', () => {
    it('always passes organizationId from user JWT to service', async () => {
      await controller.findAll(ADMIN_USER);
      expect(service.findAllUnified).toHaveBeenCalledWith('org-1');

      await controller.findOne('x', ADMIN_USER);
      expect(service.findOneUnified).toHaveBeenCalledWith('x', 'org-1');

      await controller.publish('x', ADMIN_USER);
      expect(service.publishTemplate).toHaveBeenCalledWith('x', 'org-1');

      await controller.unpublish('x', ADMIN_USER);
      expect(service.unpublishTemplate).toHaveBeenCalledWith('x', 'org-1');

      await controller.archive('x', ADMIN_USER);
      expect(service.archiveUnified).toHaveBeenCalledWith('x', 'org-1');
    });
  });
});
