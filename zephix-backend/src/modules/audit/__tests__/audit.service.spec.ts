import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService, sanitizeJson } from '../services/audit.service';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditEntityType, AuditAction, AuditSource } from '../audit.constants';

describe('AuditService', () => {
  let service: AuditService;
  let mockRepo: any;
  let savedEvent: any;

  beforeEach(async () => {
    savedEvent = null;
    mockRepo = {
      save: jest.fn().mockImplementation((event: any) => {
        savedEvent = { ...event, id: 'evt-1', createdAt: new Date() };
        return Promise.resolve(savedEvent);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditEvent), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  // ── record() ─────────────────────────────────────────────────────

  it('saves an audit event with correct fields', async () => {
    await service.record({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      actorUserId: 'user-1',
      actorPlatformRole: 'ADMIN',
      entityType: AuditEntityType.WORK_TASK,
      entityId: 'task-1',
      action: AuditAction.UPDATE,
      metadata: { changedFields: ['status'] },
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const arg = mockRepo.save.mock.calls[0][0];
    expect(arg.organizationId).toBe('org-1');
    expect(arg.workspaceId).toBe('ws-1');
    expect(arg.actorUserId).toBe('user-1');
    expect(arg.entityType).toBe('work_task');
    expect(arg.action).toBe('update');
  });

  it('defaults workspaceId to null when not provided', async () => {
    await service.record({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorPlatformRole: 'ADMIN',
      entityType: AuditEntityType.ORGANIZATION,
      entityId: 'org-1',
      action: AuditAction.UPDATE,
    });

    const arg = mockRepo.save.mock.calls[0][0];
    expect(arg.workspaceId).toBeNull();
  });

  it('truncates userAgent to 512 chars', async () => {
    const longUA = 'A'.repeat(600);
    await service.record({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorPlatformRole: 'ADMIN',
      entityType: AuditEntityType.ORGANIZATION,
      entityId: 'org-1',
      action: AuditAction.UPDATE,
      userAgent: longUA,
    });

    const arg = mockRepo.save.mock.calls[0][0];
    expect(arg.userAgent.length).toBe(512);
  });

  it('uses transactional manager when provided', async () => {
    const mockManager = {
      save: jest.fn().mockResolvedValue({ id: 'evt-tx' }),
    };

    await service.record(
      {
        organizationId: 'org-1',
        actorUserId: 'user-1',
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.BASELINE,
        entityId: 'bl-1',
        action: AuditAction.CREATE,
      },
      { manager: mockManager as any },
    );

    expect(mockManager.save).toHaveBeenCalledTimes(1);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('falls back to default repo when manager not provided', async () => {
    await service.record({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorPlatformRole: 'ADMIN',
      entityType: AuditEntityType.BASELINE,
      entityId: 'bl-1',
      action: AuditAction.CREATE,
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('does not throw when save fails — audit must never break business flow', async () => {
    mockRepo.save.mockRejectedValueOnce(new Error('DB down'));

    const result = await service.record({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorPlatformRole: 'ADMIN',
      entityType: AuditEntityType.WORK_TASK,
      entityId: 'task-1',
      action: AuditAction.UPDATE,
    });

    // Should return the unsaved event object, not throw
    expect(result).toBeDefined();
    expect(result.organizationId).toBe('org-1');
  });

  it('defaults actorPlatformRole to SYSTEM when empty string provided', async () => {
    await service.record({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorPlatformRole: '',
      entityType: AuditEntityType.WORK_TASK,
      entityId: 'task-1',
      action: AuditAction.UPDATE,
    });

    const arg = mockRepo.save.mock.calls[0][0];
    expect(arg.actorPlatformRole).toBe('SYSTEM');
  });

  // ── sanitizeJson() ──────────────────────────────────────────────

  it('sanitizes token keys from metadata', () => {
    const result = sanitizeJson({
      fileName: 'doc.pdf',
      token: 'secret-token-123',
      refreshToken: 'refresh-val',
    });

    expect(result).toEqual({ fileName: 'doc.pdf' });
  });

  it('sanitizes password keys', () => {
    const result = sanitizeJson({
      userId: 'u-1',
      password: 'mysecret',
      oldPassword: 'oldsecret',
    });

    expect(result).toEqual({ userId: 'u-1' });
  });

  it('sanitizes presigned URL keys', () => {
    const result = sanitizeJson({
      attachmentId: 'att-1',
      presignedUrl: 'https://s3.example.com/...',
      presignedPutUrl: 'https://s3.example.com/put...',
    });

    expect(result).toEqual({ attachmentId: 'att-1' });
  });

  it('sanitizes url keys', () => {
    const result = sanitizeJson({
      fileName: 'test.txt',
      url: 'https://example.com/something',
      storageEndpoint: 'https://s3.region.amazonaws.com',
    });

    expect(result).toEqual({ fileName: 'test.txt' });
  });

  it('sanitizes keys containing forbidden substrings', () => {
    const result = sanitizeJson({
      name: 'test',
      stripeSecretKey: 'sk_test_123',
      apiKey: 'key-abc',
      authorization: 'Bearer token',
    });

    expect(result).toEqual({ name: 'test' });
  });

  it('returns null for null input', () => {
    expect(sanitizeJson(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(sanitizeJson(undefined)).toBeNull();
  });

  it('returns null when all keys are forbidden', () => {
    const result = sanitizeJson({
      token: 'abc',
      password: '123',
    });
    expect(result).toBeNull();
  });

  it('preserves safe keys and strips forbidden ones', () => {
    const result = sanitizeJson({
      entityId: 'e-1',
      parentType: 'work_task',
      sizeBytes: 12345,
      secret: 'supersecret',
      source: AuditSource.ATTACHMENTS,
    });

    expect(result).toEqual({
      entityId: 'e-1',
      parentType: 'work_task',
      sizeBytes: 12345,
      source: 'attachments',
    });
  });

  // ── query() ─────────────────────────────────────────────────────

  it('queries with organizationId scope', async () => {
    const qb = mockRepo.createQueryBuilder();
    await service.query({
      organizationId: 'org-1',
      page: 1,
      pageSize: 50,
    });

    expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('applies workspace filter when provided', async () => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);

    await service.query({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      page: 1,
      pageSize: 50,
    });

    // Should have where for org AND andWhere for workspace
    expect(mockQb.where).toHaveBeenCalled();
    expect(mockQb.andWhere).toHaveBeenCalled();
  });

  it('applies entityType filter when provided', async () => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);

    await service.query({
      organizationId: 'org-1',
      entityType: 'work_task',
      page: 1,
      pageSize: 50,
    });

    const andWhereCalls = mockQb.andWhere.mock.calls;
    const entityTypeCall = andWhereCalls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('entityType'),
    );
    expect(entityTypeCall).toBeDefined();
  });

  it('paginates correctly with skip/take', async () => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);

    await service.query({
      organizationId: 'org-1',
      page: 3,
      pageSize: 20,
    });

    expect(mockQb.skip).toHaveBeenCalledWith(40); // (3-1)*20
    expect(mockQb.take).toHaveBeenCalledWith(20);
  });

  it('orders by createdAt DESC', async () => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);

    await service.query({
      organizationId: 'org-1',
      page: 1,
      pageSize: 50,
    });

    expect(mockQb.orderBy).toHaveBeenCalledWith('ae.createdAt', 'DESC');
  });
});
