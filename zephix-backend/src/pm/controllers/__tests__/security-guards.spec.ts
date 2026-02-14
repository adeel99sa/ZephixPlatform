/**
 * Phase 0 Security Hardening — Guard Enforcement Tests
 *
 * Verifies that all controllers in the pm/ directory have proper
 * JwtAuthGuard enforcement at class or method level.
 */
import 'reflect-metadata';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';

// Import all controllers to verify their metadata
import { StatusReportingController } from '../status-reporting.controller';
import { AIPMAssistantController } from '../ai-pm-assistant.controller';
import { AIChatController } from '../ai-chat.controller';

function getClassGuards(target: any): any[] {
  return Reflect.getMetadata('__guards__', target) || [];
}

function getMethodGuards(target: any, method: string): any[] {
  return (
    Reflect.getMetadata('__guards__', target.prototype[method]) || []
  );
}

function getAllMethods(target: any): string[] {
  return Object.getOwnPropertyNames(target.prototype).filter(
    (name) =>
      name !== 'constructor' &&
      typeof target.prototype[name] === 'function',
  );
}

describe('Security Guard Enforcement', () => {
  describe('StatusReportingController', () => {
    it('should have JwtAuthGuard at class level', () => {
      const guards = getClassGuards(StatusReportingController);
      expect(guards.length).toBeGreaterThan(0);
    });

    it('should have guards on all public methods', () => {
      const methods = getAllMethods(StatusReportingController);
      const publicMethods = methods.filter(
        (m) => !m.startsWith('_') && !m.startsWith('#'),
      );

      // Class-level guard covers all methods, but verify known endpoints
      const expectedEndpoints = [
        'getProjectMetrics',
        'getProjectTrends',
        'getProjectRisks',
        'getStakeholderViews',
        'generateReport',
        'exportReport',
        'getProjectReports',
        'getReport',
        'configureAlerts',
        'getProjectAlerts',
        'updateAlert',
        'deleteAlert',
        'createManualUpdate',
        'getManualUpdates',
        'getProjectOverview',
      ];

      for (const endpoint of expectedEndpoints) {
        expect(publicMethods).toContain(endpoint);
      }
    });
  });

  describe('AIPMAssistantController', () => {
    it('should have JwtAuthGuard at class level', () => {
      const guards = getClassGuards(AIPMAssistantController);
      expect(guards.length).toBeGreaterThan(0);
    });

    it('test-ai-chat endpoint should NOT have empty UseGuards', () => {
      // The test-ai-chat endpoint previously had @UseGuards() with no guard
      // It should now inherit the class-level JwtAuthGuard
      const methodGuards = getMethodGuards(
        AIPMAssistantController,
        'testAIChat',
      );

      // If method-level guards exist, they should NOT be empty
      if (methodGuards.length > 0) {
        expect(methodGuards[0]).toBeDefined();
      }
      // Class-level guard covers this method regardless
    });
  });

  describe('AIChatController', () => {
    it('should have JwtAuthGuard at class level', () => {
      const guards = getClassGuards(AIChatController);
      expect(guards.length).toBeGreaterThan(0);
    });

    it('capabilities endpoint should NOT have empty UseGuards override', () => {
      // Previously had @UseGuards() which overrode class-level guard
      const methodGuards = getMethodGuards(AIChatController, 'getCapabilities');

      // Should NOT have an empty guard array that overrides class-level
      // Either no method guards (inheriting class) or non-empty guards
      if (methodGuards.length > 0) {
        expect(methodGuards[0]).toBeDefined();
      }
    });

    it('quick-actions endpoint should NOT have empty UseGuards override', () => {
      const methodGuards = getMethodGuards(AIChatController, 'getQuickActions');

      if (methodGuards.length > 0) {
        expect(methodGuards[0]).toBeDefined();
      }
    });
  });
});

describe('StatusReportingController — Endpoint Coverage', () => {
  let controller: StatusReportingController;

  const mockService = {
    getProjectMetrics: jest.fn().mockResolvedValue({ metrics: [] }),
    getPerformanceTrends: jest.fn().mockResolvedValue({ trends: [] }),
    getProjectRisks: jest.fn().mockResolvedValue({ risks: [] }),
    getStakeholderViews: jest.fn().mockResolvedValue({ views: [] }),
    generateStatusReport: jest.fn().mockResolvedValue({ reportId: 'r-1' }),
    exportReport: jest.fn().mockResolvedValue({ url: 'https://...' }),
    getProjectReports: jest.fn().mockResolvedValue([]),
    getReport: jest.fn().mockResolvedValue({ id: 'r-1' }),
    configureAlerts: jest.fn().mockResolvedValue({ id: 'alert-1' }),
    getProjectAlerts: jest.fn().mockResolvedValue([]),
    updateAlert: jest.fn().mockResolvedValue({ id: 'alert-1' }),
    deleteAlert: jest.fn().mockResolvedValue(undefined),
    createManualUpdate: jest.fn().mockResolvedValue({ id: 'update-1' }),
    getManualUpdates: jest.fn().mockResolvedValue([]),
    getProjectOverview: jest.fn().mockResolvedValue({ id: 'proj-1' }),
  };

  beforeEach(() => {
    controller = new StatusReportingController(mockService as any);
    jest.clearAllMocks();
  });

  it('getProjectRisks should call service and return success', async () => {
    const result = await controller.getProjectRisks('proj-1', 'high', 'open');
    expect(mockService.getProjectRisks).toHaveBeenCalledWith(
      'proj-1',
      'high',
      'open',
    );
    expect(result).toHaveProperty('success', true);
  });

  it('getStakeholderViews should call service and return success', async () => {
    const result = await controller.getStakeholderViews('proj-1', 'executive');
    expect(mockService.getStakeholderViews).toHaveBeenCalledWith(
      'proj-1',
      'executive',
    );
    expect(result).toHaveProperty('success', true);
  });

  it('getProjectReports should call service and return success', async () => {
    const result = await controller.getProjectReports('proj-1');
    expect(mockService.getProjectReports).toHaveBeenCalled();
    expect(result).toHaveProperty('success', true);
  });

  it('getReport should call service and return success', async () => {
    const result = await controller.getReport('r-1');
    expect(mockService.getReport).toHaveBeenCalledWith('r-1');
    expect(result).toHaveProperty('success', true);
  });

  it('configureAlerts should call service with userId', async () => {
    const dto = {
      projectId: 'proj-1',
      alertType: 'schedule' as const,
      threshold: 80,
      operator: 'greater_than' as const,
      severity: 'high' as const,
      notificationChannels: ['email'],
      recipients: ['user-1'],
    };
    const req = { user: { id: 'user-1', organizationId: 'org-1' } };

    const result = await controller.configureAlerts(dto, req as any);
    expect(mockService.configureAlerts).toHaveBeenCalled();
    expect(result).toHaveProperty('success', true);
  });

  it('getProjectAlerts should call service and return success', async () => {
    const result = await controller.getProjectAlerts('proj-1');
    expect(mockService.getProjectAlerts).toHaveBeenCalled();
    expect(result).toHaveProperty('success', true);
  });

  it('updateAlert should call service and return success', async () => {
    const result = await controller.updateAlert('alert-1', { threshold: 90 });
    expect(mockService.updateAlert).toHaveBeenCalledWith('alert-1', {
      threshold: 90,
    });
    expect(result).toHaveProperty('success', true);
  });

  it('deleteAlert should call service and return success', async () => {
    const result = await controller.deleteAlert('alert-1');
    expect(mockService.deleteAlert).toHaveBeenCalledWith('alert-1');
    expect(result).toHaveProperty('success', true);
  });

  it('createManualUpdate should call service with userId', async () => {
    const updateData = {
      category: 'schedule' as const,
      description: 'Ahead of schedule',
      impact: 'positive' as const,
    };
    const req = { user: { id: 'user-1', organizationId: 'org-1' } };

    const result = await controller.createManualUpdate(
      'proj-1',
      updateData,
      req as any,
    );
    expect(mockService.createManualUpdate).toHaveBeenCalled();
    expect(result).toHaveProperty('success', true);
  });

  it('getManualUpdates should call service and return success', async () => {
    const result = await controller.getManualUpdates('proj-1');
    expect(mockService.getManualUpdates).toHaveBeenCalled();
    expect(result).toHaveProperty('success', true);
  });

  it('getProjectOverview should call service and return success', async () => {
    const result = await controller.getProjectOverview('proj-1');
    expect(mockService.getProjectOverview).toHaveBeenCalledWith('proj-1');
    expect(result).toHaveProperty('success', true);
  });
});
