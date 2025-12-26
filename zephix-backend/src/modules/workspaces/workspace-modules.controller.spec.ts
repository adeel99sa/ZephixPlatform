import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceModulesController } from './workspace-modules.controller';
import { WorkspaceModuleService } from './services/workspace-module.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('WorkspaceModulesController - Contract Tests', () => {
  let controller: WorkspaceModulesController;
  let service: WorkspaceModuleService;

  const mockModuleConfig = {
    id: 'module-id',
    workspaceId: 'workspace-id',
    moduleKey: 'resource_intelligence',
    enabled: true,
    config: { hardCap: 110 },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    workspace: {} as any, // Mock workspace relation
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceModulesController],
      providers: [
        {
          provide: WorkspaceModuleService,
          useValue: {
            getAllModules: jest.fn(),
            getModule: jest.fn(),
            setModule: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkspaceModulesController>(
      WorkspaceModulesController,
    );
    service = module.get<WorkspaceModuleService>(WorkspaceModuleService);
  });

  describe('GET /api/workspaces/:workspaceId/modules', () => {
    it('should return { data: WorkspaceModuleConfig[] } format', async () => {
      jest.spyOn(service, 'getAllModules').mockResolvedValue([mockModuleConfig]);

      const result = await controller.getAllModules('workspace-id');

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0]).toHaveProperty('moduleKey');
      expect(result.data[0]).toHaveProperty('enabled');
    });

    it('should return { data: [] } when no modules exist', async () => {
      jest.spyOn(service, 'getAllModules').mockResolvedValue([]);

      const result = await controller.getAllModules('workspace-id');

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual([]);
    });
  });

  describe('GET /api/workspaces/:workspaceId/modules/:moduleKey', () => {
    it('should return { data: WorkspaceModuleConfig } format', async () => {
      jest.spyOn(service, 'getModule').mockResolvedValue(mockModuleConfig);

      const result = await controller.getModule('workspace-id', 'resource_intelligence');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('moduleKey', 'resource_intelligence');
      expect(result.data).toHaveProperty('enabled', true);
    });

    it('should throw NotFoundException (404) when module key is unknown', async () => {
      jest.spyOn(service, 'getModule').mockRejectedValue(
        new NotFoundException('Module unknown_module not found in registry'),
      );

      await expect(
        controller.getModule('workspace-id', 'unknown_module'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /api/workspaces/:workspaceId/modules/:moduleKey', () => {
    it('should return { data: WorkspaceModuleConfig } format', async () => {
      const updatedConfig = { ...mockModuleConfig, enabled: false };
      jest.spyOn(service, 'setModule').mockResolvedValue(updatedConfig);

      const result = await controller.setModule(
        'workspace-id',
        'resource_intelligence',
        { enabled: false },
        { platformRole: 'ADMIN' } as any,
      );

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('enabled', false);
    });

    it('should throw ForbiddenException for non-admin users', async () => {
      await expect(
        controller.setModule(
          'workspace-id',
          'resource_intelligence',
          { enabled: false },
          { platformRole: 'MEMBER' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

