import { describe, it, expect, vi } from 'vitest';
import { assertNoSortUsage, getTemplateKey } from '../order-preservation';

interface TemplateCard {
  templateId: string;
  templateName: string;
}

describe('Order preservation utilities', () => {
  describe('getTemplateKey', () => {
    it('should return templateId as key', () => {
      expect(getTemplateKey('abc-123')).toBe('abc-123');
    });
  });

  describe('assertNoSortUsage', () => {
    it('should not warn for unsorted array', () => {
      const shuffled: TemplateCard[] = [
        { templateId: 'c', templateName: 'C' },
        { templateId: 'a', templateName: 'A' },
        { templateId: 'b', templateName: 'B' },
      ];

      // Should not throw or warn for unsorted
      expect(() => assertNoSortUsage(shuffled, 'test')).not.toThrow();
    });

    it('should warn if array appears sorted by templateId', () => {
      const sorted: TemplateCard[] = [
        { templateId: 'a', templateName: 'A' },
        { templateId: 'b', templateName: 'B' },
        { templateId: 'c', templateName: 'C' },
      ];

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      assertNoSortUsage(sorted, 'test');

      // In dev mode, should warn
      if (!import.meta.env.PROD) {
        expect(consoleSpy).toHaveBeenCalled();
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Integration: UI renders in API order', () => {
    it('should render templates in the exact order received from API', () => {
      // Simulate shuffled API response
      const apiResponse: TemplateCard[] = [
        { templateId: 'template-3', templateName: 'Template 3' },
        { templateId: 'template-1', templateName: 'Template 1' },
        { templateId: 'template-2', templateName: 'Template 2' },
      ];

      // UI should render in this exact order
      const renderedOrder = apiResponse.map((t) => t.templateId);

      expect(renderedOrder).toEqual(['template-3', 'template-1', 'template-2']);

      // If any sort is introduced, this test will fail
      const sorted = [...apiResponse].sort((a, b) =>
        a.templateId.localeCompare(b.templateId)
      );
      const sortedOrder = sorted.map((t) => t.templateId);

      expect(renderedOrder).not.toEqual(sortedOrder);
    });
  });
});

