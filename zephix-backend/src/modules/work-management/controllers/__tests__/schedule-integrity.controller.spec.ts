/**
 * Phase 2C: Schedule integrity endpoint test.
 * Tests cycle detection, orphan tasks, invalid dependencies, missing dates.
 */
import { ScheduleIntegrityController } from '../schedule-integrity.controller';
import { CriticalPathEngineService } from '../../services/critical-path-engine.service';
import { DependencyType } from '../../enums/task.enums';

describe('ScheduleIntegrityController', () => {
  let controller: ScheduleIntegrityController;
  let cpEngine: CriticalPathEngineService;
  const mockTaskRepo = { find: jest.fn() };
  const mockDepRepo = { find: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    cpEngine = new CriticalPathEngineService(null as any, null as any);
    controller = new ScheduleIntegrityController(
      cpEngine,
      mockTaskRepo as any,
      mockDepRepo as any,
    );
  });

  const req = {
    user: { organizationId: 'org-1' },
    headers: { 'x-workspace-id': 'ws-1' },
  };

  it('detects cycle in project', async () => {
    // A → B → A (cycle)
    mockTaskRepo.find.mockResolvedValue([
      { id: 'a', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
      { id: 'b', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
    ]);
    mockDepRepo.find.mockResolvedValue([
      { predecessorTaskId: 'a', successorTaskId: 'b', type: DependencyType.FINISH_TO_START, lagMinutes: 0 },
      { predecessorTaskId: 'b', successorTaskId: 'a', type: DependencyType.FINISH_TO_START, lagMinutes: 0 },
    ]);

    const result = await controller.getScheduleIntegrity('proj-1', req);
    expect(result.data.hasCycles).toBe(true);
  });

  it('counts orphan tasks', async () => {
    mockTaskRepo.find.mockResolvedValue([
      { id: 'a', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
      { id: 'b', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
      { id: 'orphan', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
    ]);
    mockDepRepo.find.mockResolvedValue([
      { predecessorTaskId: 'a', successorTaskId: 'b', type: DependencyType.FINISH_TO_START, lagMinutes: 0 },
    ]);

    const result = await controller.getScheduleIntegrity('proj-1', req);
    expect(result.data.orphanTasks).toBe(1); // 'orphan' has no deps
  });

  it('counts missing planned dates', async () => {
    mockTaskRepo.find.mockResolvedValue([
      { id: 'a', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
      { id: 'b', plannedStartAt: null, plannedEndAt: null, isMilestone: false },
      { id: 'c', plannedStartAt: new Date(), plannedEndAt: null, isMilestone: false },
    ]);
    mockDepRepo.find.mockResolvedValue([]);

    const result = await controller.getScheduleIntegrity('proj-1', req);
    expect(result.data.missingDates).toBe(2); // b and c
  });

  it('reports no issues for clean project', async () => {
    mockTaskRepo.find.mockResolvedValue([
      { id: 'a', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
      { id: 'b', plannedStartAt: new Date(), plannedEndAt: new Date(), isMilestone: false },
    ]);
    mockDepRepo.find.mockResolvedValue([
      { predecessorTaskId: 'a', successorTaskId: 'b', type: DependencyType.FINISH_TO_START, lagMinutes: 0 },
    ]);

    const result = await controller.getScheduleIntegrity('proj-1', req);
    expect(result.data.hasCycles).toBe(false);
    expect(result.data.orphanTasks).toBe(0);
    expect(result.data.invalidDependencies).toBe(0);
    expect(result.data.missingDates).toBe(0);
  });
});
