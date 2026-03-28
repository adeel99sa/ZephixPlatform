import 'reflect-metadata';
import { WorkRisksController } from '../work-risks.controller';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

describe('WorkRisksController — Guard & Route Enforcement', () => {
  function getClassGuards(target: Function) {
    return Reflect.getMetadata('__guards__', target) || [];
  }

  it('should have JwtAuthGuard at class level', () => {
    const guards = getClassGuards(WorkRisksController);
    const guardInstances = guards.map((g: any) =>
      typeof g === 'function' ? g : g?.constructor,
    );
    expect(guardInstances).toContain(JwtAuthGuard);
  });

  it('should register controller under work/risks prefix', () => {
    const controllerPath = Reflect.getMetadata('path', WorkRisksController);
    expect(controllerPath).toBe('work/risks');
  });

  it('should have CRUD methods', () => {
    const proto = WorkRisksController.prototype;
    expect(typeof proto.listRisks).toBe('function');
    expect(typeof proto.createRisk).toBe('function');
    expect(typeof proto.getRisk).toBe('function');
    expect(typeof proto.updateRisk).toBe('function');
    expect(typeof proto.deleteRisk).toBe('function');
  });
});
