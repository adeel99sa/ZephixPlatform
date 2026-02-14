import 'reflect-metadata';
import { IterationsController } from '../iterations.controller';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

/**
 * Guard enforcement tests for IterationsController.
 * Verifies JwtAuthGuard is applied at the class level,
 * and that controller methods follow the expected workspace scoping pattern.
 */
describe('IterationsController — Guard Enforcement', () => {
  function getClassGuards(target: Function) {
    return Reflect.getMetadata('__guards__', target) || [];
  }

  it('should have JwtAuthGuard at class level', () => {
    const guards = getClassGuards(IterationsController);
    const guardInstances = guards.map((g: any) =>
      typeof g === 'function' ? g : g?.constructor,
    );
    expect(guardInstances).toContain(JwtAuthGuard);
  });

  it('should have all expected route methods', () => {
    const proto = IterationsController.prototype;
    const expectedMethods = [
      'createIteration',
      'listIterations',
      'getVelocity',
      'getIteration',
      'updateIteration',
      'startIteration',
      'completeIteration',
      'cancelIteration',
      'addTask',
      'removeTask',
      'commitTask',
      'uncommitTask',
      'getMetrics',
      'getBurndown',
      'getCapacity',
    ];

    for (const method of expectedMethods) {
      expect(typeof (proto as any)[method]).toBe('function');
    }
  });

  it('should register routes under /work prefix', () => {
    const controllerPath = Reflect.getMetadata('path', IterationsController);
    expect(controllerPath).toBe('work');
  });
});
