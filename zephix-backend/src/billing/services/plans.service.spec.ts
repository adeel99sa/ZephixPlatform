import { PlansService } from './plans.service';
import { PlanType } from '../entities/plan.entity';

describe('PlansService', () => {
  let service: PlansService;
  let mockPlanRepo: any;

  beforeEach(() => {
    mockPlanRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };

    service = new PlansService(mockPlanRepo);
  });

  describe('findAll', () => {
    it('returns plans from database when available', async () => {
      const plans = [
        { id: '1', name: 'Starter', type: PlanType.STARTER, price: 0, isActive: true },
        { id: '2', name: 'Professional', type: PlanType.PROFESSIONAL, price: 17.99, isActive: true },
      ];
      mockPlanRepo.find.mockResolvedValue(plans);

      const result = await service.findAll();
      expect(result).toEqual(plans);
      expect(mockPlanRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { price: 'ASC' },
      });
    });

    it('returns mocked plans when database is empty', async () => {
      mockPlanRepo.find.mockResolvedValue([]);

      const result = await service.findAll();
      expect(result.length).toBe(3);
      expect(result[0].type).toBe(PlanType.STARTER);
      expect(result[1].type).toBe(PlanType.PROFESSIONAL);
      expect(result[2].type).toBe(PlanType.ENTERPRISE);
    });

    it('returns mocked plans on database error (fallback)', async () => {
      mockPlanRepo.find.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.findAll();
      expect(result.length).toBe(3);
      expect(result[0].name).toBe('Starter');
    });
  });

  describe('findOne', () => {
    it('returns plan by id', async () => {
      const plan = { id: 'plan-1', type: PlanType.PROFESSIONAL };
      mockPlanRepo.findOne.mockResolvedValue(plan);

      const result = await service.findOne('plan-1');
      expect(result).toEqual(plan);
      expect(mockPlanRepo.findOne).toHaveBeenCalledWith({ where: { id: 'plan-1' } });
    });

    it('returns null when plan not found', async () => {
      mockPlanRepo.findOne.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    it('returns active plan by type', async () => {
      const plan = { id: 'plan-1', type: PlanType.ENTERPRISE, isActive: true };
      mockPlanRepo.findOne.mockResolvedValue(plan);

      const result = await service.findByType(PlanType.ENTERPRISE);
      expect(result).toEqual(plan);
      expect(mockPlanRepo.findOne).toHaveBeenCalledWith({
        where: { type: PlanType.ENTERPRISE, isActive: true },
      });
    });
  });

  describe('seedPlans', () => {
    it('seeds plans when database is empty', async () => {
      mockPlanRepo.count.mockResolvedValue(0);

      await service.seedPlans();
      expect(mockPlanRepo.save).toHaveBeenCalled();
    });

    it('skips seeding when plans already exist', async () => {
      mockPlanRepo.count.mockResolvedValue(3);

      await service.seedPlans();
      expect(mockPlanRepo.save).not.toHaveBeenCalled();
    });
  });
});