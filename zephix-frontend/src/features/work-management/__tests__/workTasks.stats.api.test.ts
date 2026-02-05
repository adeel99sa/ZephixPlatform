import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the api module before importing the stats API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  unwrapApiData: vi.fn((response) => response.data.data),
}));

import { api } from '@/lib/api';
import {
  getCompletionStats,
  getProjectCompletionStats,
  invalidateStatsCache,
  CACHE_TTL_MS,
} from '../workTasks.stats.api';

describe('workTasks.stats.api', () => {
  const mockStats = { completed: 5, total: 10, ratio: 0.5 };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache before each test
    invalidateStatsCache();

    // Setup mock response
    (api.get as any).mockResolvedValue({
      data: { data: mockStats },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    invalidateStatsCache();
  });

  describe('cache TTL behavior', () => {
    it('should cache results for CACHE_TTL_MS', async () => {
      const projectId = 'test-project-123';

      // First call - should hit network
      const result1 = await getProjectCompletionStats(projectId);
      expect(result1).toEqual(mockStats);
      expect(api.get).toHaveBeenCalledTimes(1);

      // Second call within TTL - should return cached
      const result2 = await getProjectCompletionStats(projectId);
      expect(result2).toEqual(mockStats);
      expect(api.get).toHaveBeenCalledTimes(1); // Still 1, no new call

      // Verify cache TTL is 2 seconds
      expect(CACHE_TTL_MS).toBe(2000);
    });

    it('should make new call after cache invalidation', async () => {
      const projectId = 'test-project-456';
      const updatedStats = { completed: 6, total: 10, ratio: 0.6 };

      // First call
      await getProjectCompletionStats(projectId);
      expect(api.get).toHaveBeenCalledTimes(1);

      // Second call - should return cached
      await getProjectCompletionStats(projectId);
      expect(api.get).toHaveBeenCalledTimes(1);

      // Invalidate cache
      invalidateStatsCache(projectId);

      // Update mock for new response
      (api.get as any).mockResolvedValueOnce({
        data: { data: updatedStats },
      });

      // Third call after invalidation - should hit network
      const result3 = await getProjectCompletionStats(projectId);
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(result3).toEqual(updatedStats);
    });

    it('should cache workspace and project stats separately', async () => {
      const projectId = 'test-project-789';

      // Call project stats
      await getProjectCompletionStats(projectId);
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenLastCalledWith(
        '/work/tasks/stats/completion',
        { params: { projectId } }
      );

      // Call workspace stats (no projectId)
      await getCompletionStats();
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(api.get).toHaveBeenLastCalledWith(
        '/work/tasks/stats/completion',
        { params: undefined }
      );

      // Both should be cached now - no new calls
      await getProjectCompletionStats(projectId);
      await getCompletionStats();
      expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache when invalidating without projectId', async () => {
      const projectId1 = 'project-1';
      const projectId2 = 'project-2';

      // Cache multiple entries
      await getProjectCompletionStats(projectId1);
      await getProjectCompletionStats(projectId2);
      await getCompletionStats(); // workspace
      expect(api.get).toHaveBeenCalledTimes(3);

      // All cached
      await getProjectCompletionStats(projectId1);
      await getProjectCompletionStats(projectId2);
      await getCompletionStats();
      expect(api.get).toHaveBeenCalledTimes(3);

      // Invalidate all (no projectId)
      invalidateStatsCache();

      // All should make new calls
      await getProjectCompletionStats(projectId1);
      await getProjectCompletionStats(projectId2);
      await getCompletionStats();
      expect(api.get).toHaveBeenCalledTimes(6);
    });

    it('should only invalidate specific project when projectId provided', async () => {
      const projectId1 = 'project-a';
      const projectId2 = 'project-b';

      // Cache both
      await getProjectCompletionStats(projectId1);
      await getProjectCompletionStats(projectId2);
      expect(api.get).toHaveBeenCalledTimes(2);

      // Invalidate only project1
      invalidateStatsCache(projectId1);

      // Project1 should make new call, project2 should be cached
      await getProjectCompletionStats(projectId1);
      expect(api.get).toHaveBeenCalledTimes(3);

      await getProjectCompletionStats(projectId2);
      expect(api.get).toHaveBeenCalledTimes(3); // Still 3, project2 cached
    });
  });

  describe('API contract', () => {
    it('should call correct endpoint with projectId', async () => {
      const projectId = 'my-project';
      await getProjectCompletionStats(projectId);

      expect(api.get).toHaveBeenCalledWith(
        '/work/tasks/stats/completion',
        { params: { projectId } }
      );
    });

    it('should call correct endpoint without projectId for workspace stats', async () => {
      await getCompletionStats();

      expect(api.get).toHaveBeenCalledWith(
        '/work/tasks/stats/completion',
        { params: undefined }
      );
    });
  });
});
