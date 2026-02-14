/**
 * Phase 2E: Capacity Calendar Service Tests
 */
import { CapacityCalendarService, DEFAULT_CAPACITY_HOURS } from '../capacity-calendar.service';

describe('CapacityCalendarService', () => {
  let service: CapacityCalendarService;
  const mockRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const orgId = 'org-1';
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CapacityCalendarService(mockRepo as any);

    // Default: createQueryBuilder returns chainable mock
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockRepo.createQueryBuilder.mockReturnValue(qb);
  });

  describe('DEFAULT_CAPACITY_HOURS', () => {
    it('is 8 hours', () => {
      expect(DEFAULT_CAPACITY_HOURS).toBe(8);
    });
  });

  describe('enumerateDates', () => {
    it('enumerates single day range', () => {
      const dates = service.enumerateDates('2026-02-09', '2026-02-09');
      expect(dates).toEqual(['2026-02-09']);
    });

    it('enumerates multi-day range', () => {
      const dates = service.enumerateDates('2026-02-09', '2026-02-13');
      expect(dates).toHaveLength(5);
      expect(dates[0]).toBe('2026-02-09');
      expect(dates[4]).toBe('2026-02-13');
    });

    it('returns empty for invalid range', () => {
      const dates = service.enumerateDates('2026-02-15', '2026-02-09');
      expect(dates).toHaveLength(0);
    });
  });

  describe('getDailyCapacity', () => {
    it('returns empty array for empty userIds', async () => {
      const result = await service.getDailyCapacity({
        organizationId: orgId,
        workspaceId: wsId,
        userIds: [],
        fromDate: '2026-02-09',
        toDate: '2026-02-13',
      });
      expect(result).toEqual([]);
    });

    it('queries with correct scoping params', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getDailyCapacity({
        organizationId: orgId,
        workspaceId: wsId,
        userIds: ['u1'],
        fromDate: '2026-02-09',
        toDate: '2026-02-13',
      });

      expect(qb.where).toHaveBeenCalledWith('c.organization_id = :orgId', { orgId });
      expect(qb.andWhere).toHaveBeenCalledWith('c.workspace_id = :wsId', { wsId });
    });
  });

  describe('setDailyCapacity', () => {
    it('updates existing record', async () => {
      const existing = { id: 'cap-1', capacityHours: 8 };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({ ...existing, capacityHours: 4 });

      const result = await service.setDailyCapacity({
        organizationId: orgId,
        workspaceId: wsId,
        userId: 'u1',
        date: '2026-02-10',
        capacityHours: 4,
      });

      expect(mockRepo.save).toHaveBeenCalled();
      expect(existing.capacityHours).toBe(4);
    });

    it('creates new record when none exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({ id: 'new', capacityHours: 6 });
      mockRepo.save.mockResolvedValue({ id: 'new', capacityHours: 6 });

      await service.setDailyCapacity({
        organizationId: orgId,
        workspaceId: wsId,
        userId: 'u1',
        date: '2026-02-10',
        capacityHours: 6,
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          workspaceId: wsId,
          userId: 'u1',
          date: '2026-02-10',
          capacityHours: 6,
        }),
      );
    });
  });

  describe('buildCapacityMap', () => {
    it('defaults weekdays to 8h and weekends to 0h', async () => {
      const map = await service.buildCapacityMap({
        organizationId: orgId,
        workspaceId: wsId,
        userIds: ['u1'],
        fromDate: '2026-02-09', // Monday
        toDate: '2026-02-15',   // Sunday
      });

      const userMap = map.get('u1')!;
      expect(userMap.get('2026-02-09')).toBe(8); // Mon
      expect(userMap.get('2026-02-14')).toBe(0); // Sat
      expect(userMap.get('2026-02-15')).toBe(0); // Sun
    });

    it('applies overrides from database', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { userId: 'u1', date: '2026-02-10', capacityHours: 4 },
        ]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const map = await service.buildCapacityMap({
        organizationId: orgId,
        workspaceId: wsId,
        userIds: ['u1'],
        fromDate: '2026-02-09',
        toDate: '2026-02-13',
      });

      const userMap = map.get('u1')!;
      expect(userMap.get('2026-02-10')).toBe(4); // Override
      expect(userMap.get('2026-02-09')).toBe(8); // Default
    });
  });
});
