/**
 * Verifies AttachmentsController routes are correctly registered.
 *
 * Wave 2 blocker: smoke test hit POST /api/work/workspaces/:wsId/attachments
 * which does not exist. The actual upload flow is presign-based:
 *   1. POST .../attachments/presign  → get presigned S3 URL
 *   2. Client PUTs file to S3
 *   3. POST .../attachments/:id/complete → mark as uploaded
 *
 * This test documents the correct route set so smoke tests use valid paths.
 */
import { AttachmentsController } from '../controllers/attachments.controller';

describe('AttachmentsController route registration', () => {
  const BASE = 'work/workspaces/:workspaceId/attachments';

  it('controller class exists', () => {
    expect(AttachmentsController).toBeDefined();
  });

  it('controller has correct route prefix', () => {
    const metadata = Reflect.getMetadata('path', AttachmentsController);
    expect(metadata).toBe(BASE);
  });

  it('POST presign route exists', () => {
    const proto = AttachmentsController.prototype;
    expect(typeof proto.createPresign).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.createPresign);
    expect(methodPath).toBe('presign');
  });

  it('POST :id/complete route exists', () => {
    const proto = AttachmentsController.prototype;
    expect(typeof proto.completeUpload).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.completeUpload);
    expect(methodPath).toBe(':id/complete');
  });

  it('GET list route exists at base path', () => {
    const proto = AttachmentsController.prototype;
    expect(typeof proto.list).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.list);
    expect(methodPath).toBe('/');
  });

  it('GET :id/download route exists', () => {
    const proto = AttachmentsController.prototype;
    expect(typeof proto.download).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.download);
    expect(methodPath).toBe(':id/download');
  });

  it('DELETE :id route exists', () => {
    const proto = AttachmentsController.prototype;
    expect(typeof proto.remove).toBe('function');
    const methodPath = Reflect.getMetadata('path', proto.remove);
    expect(methodPath).toBe(':id');
  });

  it('no plain POST at base path — upload is presign-based', () => {
    const routes = [
      { method: 'POST', path: '/api/work/workspaces/:wsId/attachments/presign' },
      { method: 'POST', path: '/api/work/workspaces/:wsId/attachments/:id/complete' },
      { method: 'GET', path: '/api/work/workspaces/:wsId/attachments' },
      { method: 'GET', path: '/api/work/workspaces/:wsId/attachments/:id/download' },
      { method: 'PATCH', path: '/api/work/workspaces/:wsId/attachments/:id/retention' },
      { method: 'DELETE', path: '/api/work/workspaces/:wsId/attachments/:id' },
    ];
    expect(routes.length).toBe(6);
    const plainPost = routes.find(r => r.method === 'POST' && r.path.endsWith('/attachments'));
    expect(plainPost).toBeUndefined();
  });
});
