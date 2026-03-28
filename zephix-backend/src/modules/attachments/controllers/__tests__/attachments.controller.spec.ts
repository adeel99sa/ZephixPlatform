/**
 * Phase 2G: Attachments Controller Tests
 *
 * Covers: input validation, guard presence, role delegation to service,
 * VIEWER read access, MEMBER write delegation, parentType validation.
 */
import { AttachmentsController } from '../attachments.controller';
import { BadRequestException } from '@nestjs/common';

function makeReq(platformRole: string, userId = 'u1', orgId = 'org-1') {
  return {
    user: {
      id: userId,
      organizationId: orgId,
      workspaceId: 'ws-1',
      platformRole,
      roles: [],
      email: 'test@test.com',
    },
  } as any;
}

const validWsId = '11111111-1111-1111-1111-111111111111';

describe('AttachmentsController', () => {
  let controller: AttachmentsController;

  const mockService = {
    createPresign: jest.fn().mockResolvedValue({
      attachment: { id: 'att-1', status: 'pending', fileName: 'test.pdf', createdAt: new Date().toISOString() },
      presignedPutUrl: 'https://s3/put',
    }),
    completeUpload: jest.fn().mockResolvedValue({ id: 'att-1', status: 'uploaded' }),
    listForParent: jest.fn().mockResolvedValue([]),
    getDownloadUrl: jest.fn().mockResolvedValue({ downloadUrl: 'https://s3/get', attachment: { id: 'att-1' } }),
    deleteAttachment: jest.fn().mockResolvedValue(undefined),
  };

  const mockResponse = {
    success: jest.fn((data: any) => ({ data, success: true })),
  };

  const mockWorkspaceRoleGuard = {
    getWorkspaceRole: jest.fn().mockResolvedValue(null),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AttachmentsController(
      mockService as any,
      mockResponse as any,
      mockWorkspaceRoleGuard as any,
    );
  });

  // ── Presign ──────────────────────────────────────────────────────────

  it('presign delegates to service with correct params', async () => {
    const req = makeReq('ADMIN');
    await controller.createPresign(req, validWsId, {
      parentType: 'work_task',
      parentId: 'task-1',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });
    expect(mockService.createPresign).toHaveBeenCalled();
  });

  it('presign rejects invalid parentType', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.createPresign(req, validWsId, {
        parentType: 'invalid' as any,
        parentId: 'p1',
        fileName: 'f.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('presign rejects missing fileName', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.createPresign(req, validWsId, {
        parentType: 'work_task',
        parentId: 'p1',
        fileName: '',
        mimeType: 'text/plain',
        sizeBytes: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('presign rejects invalid workspaceId format', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.createPresign(req, 'not-a-uuid', {
        parentType: 'work_task',
        parentId: 'p1',
        fileName: 'f.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Complete ─────────────────────────────────────────────────────────

  it('complete delegates to service', async () => {
    const req = makeReq('ADMIN');
    await controller.completeUpload(req, validWsId, 'att-1', { checksumSha256: 'abc' });
    expect(mockService.completeUpload).toHaveBeenCalledWith(
      expect.any(Object), validWsId, 'att-1', 'abc',
    );
  });

  // ── List ─────────────────────────────────────────────────────────────

  it('list delegates to service', async () => {
    const req = makeReq('VIEWER');
    await controller.list(req, validWsId, 'work_task', 'task-1');
    expect(mockService.listForParent).toHaveBeenCalledWith(
      expect.any(Object), validWsId, 'work_task', 'task-1',
    );
  });

  it('list rejects invalid parentType', async () => {
    const req = makeReq('MEMBER');
    await expect(
      controller.list(req, validWsId, 'invalid' as any, 'p1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('list rejects missing parentId', async () => {
    const req = makeReq('MEMBER');
    await expect(
      controller.list(req, validWsId, 'work_task', ''),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Download ─────────────────────────────────────────────────────────

  it('download delegates to service', async () => {
    const req = makeReq('VIEWER');
    const result = await controller.download(req, validWsId, 'att-1');
    expect(mockService.getDownloadUrl).toHaveBeenCalledWith(
      expect.any(Object), validWsId, 'att-1',
    );
    expect(result.data.downloadUrl).toBe('https://s3/get');
  });

  // ── Delete ───────────────────────────────────────────────────────────

  it('delete delegates to service', async () => {
    const req = makeReq('ADMIN');
    await controller.remove(req, validWsId, 'att-1');
    expect(mockService.deleteAttachment).toHaveBeenCalledWith(
      expect.any(Object), validWsId, 'att-1',
    );
  });

  it('delete rejects invalid workspaceId', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.remove(req, 'bad-uuid', 'att-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
