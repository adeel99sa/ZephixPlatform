/**
 * Phase 2C: Project health metrics endpoint test.
 */
import { ProjectHealthController } from '../project-health.controller';

describe('ProjectHealthController', () => {
  let controller: ProjectHealthController;
  const mockTaskRepo = { count: jest.fn() };
  const mockDepRepo = { count: jest.fn() };
  const mockBaselineRepo = { count: jest.fn() };
  const mockSnapshotRepo = { count: jest.fn() };
  const mockIterationRepo = { count: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProjectHealthController(
      mockTaskRepo as any,
      mockDepRepo as any,
      mockBaselineRepo as any,
      mockSnapshotRepo as any,
      mockIterationRepo as any,
    );
  });

  it('returns all project metrics', async () => {
    mockTaskRepo.count
      .mockResolvedValueOnce(120) // taskCount
      .mockResolvedValueOnce(5);  // milestoneCount
    mockDepRepo.count.mockResolvedValue(80);
    mockBaselineRepo.count.mockResolvedValue(3);
    mockSnapshotRepo.count.mockResolvedValue(7);
    mockIterationRepo.count.mockResolvedValue(4);

    const req = { user: { organizationId: 'org-1' } };
    const result = await controller.getProjectHealth('proj-1', req);

    expect(result.success).toBe(true);
    expect(result.data.taskCount).toBe(120);
    expect(result.data.dependencyCount).toBe(80);
    expect(result.data.milestoneCount).toBe(5);
    expect(result.data.baselineCount).toBe(3);
    expect(result.data.earnedValueSnapshots).toBe(7);
    expect(result.data.iterationCount).toBe(4);
  });

  it('scopes queries by organizationId', async () => {
    mockTaskRepo.count.mockResolvedValue(0);
    mockDepRepo.count.mockResolvedValue(0);
    mockBaselineRepo.count.mockResolvedValue(0);
    mockSnapshotRepo.count.mockResolvedValue(0);
    mockIterationRepo.count.mockResolvedValue(0);

    const req = { user: { organizationId: 'org-2' } };
    await controller.getProjectHealth('proj-1', req);

    // Task queries scoped by org
    expect(mockTaskRepo.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-2' }),
      }),
    );
    expect(mockDepRepo.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-2' }),
      }),
    );
  });
});
