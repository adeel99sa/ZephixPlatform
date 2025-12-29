import { formatResponse, formatArrayResponse, formatPaginatedResponse, formatStatsResponse } from './response.helper';

describe('Response Helper - Contract Enforcement', () => {
  describe('formatResponse', () => {
    it('should wrap data in { data: T } format', () => {
      const result = formatResponse({ id: '1', name: 'Test' });
      expect(result).toEqual({ data: { id: '1', name: 'Test' } });
    });

    it('should handle null', () => {
      const result = formatResponse(null);
      expect(result).toEqual({ data: null });
    });

    it('should handle arrays', () => {
      const result = formatResponse([1, 2, 3]);
      expect(result).toEqual({ data: [1, 2, 3] });
    });

    it('should handle empty arrays', () => {
      const result = formatResponse([]);
      expect(result).toEqual({ data: [] });
    });
  });

  describe('formatArrayResponse', () => {
    it('should wrap array in { data: T[] } format', () => {
      const result = formatArrayResponse([1, 2, 3]);
      expect(result).toEqual({ data: [1, 2, 3] });
    });

    it('should return empty array for null', () => {
      const result = formatArrayResponse(null);
      expect(result).toEqual({ data: [] });
    });

    it('should return empty array for undefined', () => {
      const result = formatArrayResponse(undefined);
      expect(result).toEqual({ data: [] });
    });
  });

  describe('formatPaginatedResponse', () => {
    it('should format paginated response', () => {
      const result = formatPaginatedResponse([1, 2, 3], 10, 1, 2);
      expect(result).toEqual({
        data: {
          projects: [1, 2, 3],
          total: 10,
          page: 1,
          totalPages: 2,
        },
      });
    });

    it('should use safe defaults for missing values', () => {
      const result = formatPaginatedResponse(null, 0, 0, 0);
      expect(result).toEqual({
        data: {
          projects: [],
          total: 0,
          page: 1,
          totalPages: 0,
        },
      });
    });
  });

  describe('formatStatsResponse', () => {
    it('should format stats with defaults', () => {
      const result = formatStatsResponse(
        { total: 10, active: 5 },
        { total: 0, active: 0, completed: 0, onHold: 0 },
      );
      expect(result).toEqual({
        data: {
          total: 10,
          active: 5,
          completed: 0,
          onHold: 0,
        },
      });
    });

    it('should use all defaults for null', () => {
      const result = formatStatsResponse(
        null,
        { total: 0, active: 0, completed: 0, onHold: 0 },
      );
      expect(result).toEqual({
        data: {
          total: 0,
          active: 0,
          completed: 0,
          onHold: 0,
        },
      });
    });
  });
});





