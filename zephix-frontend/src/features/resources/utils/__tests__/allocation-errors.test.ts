import { describe, it, expect } from 'vitest';
import {
  isJustificationRequiredError,
  extractProjectedTotal,
  extractJustificationThreshold,
} from '../allocation-errors';

describe('allocation-errors', () => {
  describe('isJustificationRequiredError', () => {
    it('should return true for axios error with justification message', () => {
      const error = {
        response: {
          data: {
            message: 'Justification is required for allocations exceeding 100%. Projected total: 120%',
          },
        },
      };

      expect(isJustificationRequiredError(error)).toBe(true);
    });

    it('should return true for nested message structure', () => {
      const error = {
        response: {
          data: {
            message: {
              message: 'Justification is required for allocations exceeding 100%',
            },
          },
        },
      };

      expect(isJustificationRequiredError(error)).toBe(true);
    });

    it('should return true for case-insensitive message', () => {
      const error = {
        response: {
          data: {
            message: 'justification required for allocations',
          },
        },
      };

      expect(isJustificationRequiredError(error)).toBe(true);
    });

    it('should return true for direct error object', () => {
      const error = {
        message: 'Justification is required for allocations exceeding 100%',
      };

      expect(isJustificationRequiredError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = {
        response: {
          data: {
            message: 'Resource not found',
          },
        },
      };

      expect(isJustificationRequiredError(error)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isJustificationRequiredError(null)).toBe(false);
      expect(isJustificationRequiredError(undefined)).toBe(false);
    });
  });

  describe('extractProjectedTotal', () => {
    it('should extract projected total from error message', () => {
      const error = {
        response: {
          data: {
            message: 'Justification is required for allocations exceeding 100%. Projected total: 120%',
          },
        },
      };

      expect(extractProjectedTotal(error)).toBe(120);
    });

    it('should return null for non-justification errors', () => {
      const error = {
        response: {
          data: {
            message: 'Resource not found',
          },
        },
      };

      expect(extractProjectedTotal(error)).toBe(null);
    });
  });

  describe('extractJustificationThreshold', () => {
    it('should extract threshold from error message', () => {
      const error = {
        response: {
          data: {
            message: 'Justification is required for allocations exceeding 100%. Projected total: 120%',
          },
        },
      };

      expect(extractJustificationThreshold(error)).toBe(100);
    });

    it('should return null for non-justification errors', () => {
      const error = {
        response: {
          data: {
            message: 'Resource not found',
          },
        },
      };

      expect(extractJustificationThreshold(error)).toBe(null);
    });
  });
});






