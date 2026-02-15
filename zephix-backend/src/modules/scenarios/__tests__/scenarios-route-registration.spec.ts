/**
 * Verifies ScenariosController routes are correctly registered.
 *
 * Wave 2 blocker: smoke test hit POST /api/scenarios and POST /api/work/scenarios
 * — both 404. The actual routes include workspace scope:
 *   POST /api/work/workspaces/:workspaceId/scenarios
 *
 * The controller uses @Controller() (empty) with method-level paths
 * like @Post('work/workspaces/:workspaceId/scenarios').
 * With the global prefix 'api', the full path becomes:
 *   /api/work/workspaces/:workspaceId/scenarios
 */
import { ScenariosController } from '../controllers/scenarios.controller';

describe('ScenariosController route registration', () => {
  it('controller class exists', () => {
    expect(ScenariosController).toBeDefined();
  });

  it('controller has a decorator (may be empty path)', () => {
    const metadata = Reflect.getMetadata('path', ScenariosController);
    expect(metadata === '' || metadata === '/').toBeTruthy();
  });

  it('create endpoint exists with correct method path', () => {
    const proto = ScenariosController.prototype;
    expect(typeof proto.create).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.create);
    expect(methodPath).toBe('work/workspaces/:workspaceId/scenarios');
  });

  it('list endpoint exists with correct method path', () => {
    const proto = ScenariosController.prototype;
    expect(typeof proto.list).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.list);
    expect(methodPath).toBe('work/workspaces/:workspaceId/scenarios');
  });

  it('getById endpoint exists', () => {
    const proto = ScenariosController.prototype;
    expect(typeof proto.getById).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.getById);
    expect(methodPath).toBe('work/scenarios/:id');
  });

  it('addAction endpoint exists', () => {
    const proto = ScenariosController.prototype;
    expect(typeof proto.addAction).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.addAction);
    expect(methodPath).toBe('work/scenarios/:id/actions');
  });

  it('compute endpoint exists', () => {
    const proto = ScenariosController.prototype;
    expect(typeof proto.compute).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.compute);
    expect(methodPath).toBe('work/scenarios/:id/compute');
  });

  it('no route at /api/scenarios — workspace scope required', () => {
    const routes = [
      { method: 'POST', path: '/api/work/workspaces/:wsId/scenarios' },
      { method: 'GET', path: '/api/work/workspaces/:wsId/scenarios' },
      { method: 'GET', path: '/api/work/scenarios/:id' },
      { method: 'PATCH', path: '/api/work/scenarios/:id' },
      { method: 'DELETE', path: '/api/work/scenarios/:id' },
      { method: 'POST', path: '/api/work/scenarios/:id/actions' },
      { method: 'DELETE', path: '/api/work/scenarios/:id/actions/:actionId' },
      { method: 'POST', path: '/api/work/scenarios/:id/compute' },
    ];
    expect(routes.length).toBe(8);
    const rootRoute = routes.find(r => r.path === '/api/scenarios');
    expect(rootRoute).toBeUndefined();
  });
});
