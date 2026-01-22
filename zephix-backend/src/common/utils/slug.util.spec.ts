import {
  validateOrgSlug,
  slugify,
  generateAvailableSlug,
} from './slug.util';

describe('Slug Utility', () => {
  describe('validateOrgSlug', () => {
    it('should validate a valid slug', () => {
      const result = validateOrgSlug('acme-corp');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject slug shorter than 3 characters', () => {
      const result = validateOrgSlug('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject slug longer than 48 characters', () => {
      const longSlug = 'a'.repeat(49);
      const result = validateOrgSlug(longSlug);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 48 characters');
    });

    it('should reject slug with uppercase letters', () => {
      const result = validateOrgSlug('Acme-Corp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase letters');
    });

    it('should reject slug with special characters', () => {
      const result = validateOrgSlug('acme_corp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase letters, numbers, and hyphens');
    });

    it('should reject slug starting with hyphen', () => {
      const result = validateOrgSlug('-acme-corp');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot start or end with a hyphen');
    });

    it('should reject slug ending with hyphen', () => {
      const result = validateOrgSlug('acme-corp-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot start or end with a hyphen');
    });

    it('should reject reserved slugs', () => {
      const reserved = ['admin', 'api', 'auth', 'www', 'app', 'zephix', 'support', 'status'];
      reserved.forEach((slug) => {
        const result = validateOrgSlug(slug);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved');
      });
    });

    it('should accept slug with numbers', () => {
      const result = validateOrgSlug('acme-corp-123');
      expect(result.valid).toBe(true);
    });

    it('should accept minimum length slug (3 chars)', () => {
      const result = validateOrgSlug('abc');
      expect(result.valid).toBe(true);
    });

    it('should accept maximum length slug (48 chars)', () => {
      const longSlug = 'a'.repeat(48);
      const result = validateOrgSlug(longSlug);
      expect(result.valid).toBe(true);
    });
  });

  describe('slugify', () => {
    it('should convert org name to slug', () => {
      expect(slugify('Acme Corp')).toBe('acme-corp');
    });

    it('should handle lowercase names', () => {
      expect(slugify('acme corp')).toBe('acme-corp');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('My Company Name')).toBe('my-company-name');
    });

    it('should remove special characters', () => {
      expect(slugify('Acme & Co.')).toBe('acme-co');
    });

    it('should collapse multiple hyphens', () => {
      expect(slugify('Acme---Corp')).toBe('acme-corp');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('-Acme Corp-')).toBe('acme-corp');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should truncate to 48 characters', () => {
      const longName = 'A'.repeat(100);
      const slug = slugify(longName);
      expect(slug.length).toBeLessThanOrEqual(48);
      expect(slug).not.toMatch(/-$/); // Should not end with hyphen after truncation
    });

    it('should handle names with numbers', () => {
      expect(slugify('Company 123')).toBe('company-123');
    });

    it('should handle mixed case and special chars', () => {
      expect(slugify('My Company & Associates, LLC')).toBe('my-company-associates-llc');
    });
  });

  describe('generateAvailableSlug', () => {
    it('should return base slug if available', async () => {
      const checkExists = jest.fn().mockResolvedValue(false);
      const result = await generateAvailableSlug('acme-corp', checkExists);
      expect(result).toBe('acme-corp');
      expect(checkExists).toHaveBeenCalledTimes(1);
      expect(checkExists).toHaveBeenCalledWith('acme-corp');
    });

    it('should append -2 if base slug exists', async () => {
      const checkExists = jest
        .fn()
        .mockResolvedValueOnce(true) // base exists
        .mockResolvedValueOnce(false); // -2 available
      const result = await generateAvailableSlug('acme-corp', checkExists);
      expect(result).toBe('acme-corp-2');
      expect(checkExists).toHaveBeenCalledTimes(2);
      expect(checkExists).toHaveBeenNthCalledWith(1, 'acme-corp');
      expect(checkExists).toHaveBeenNthCalledWith(2, 'acme-corp-2');
    });

    it('should append -3 if base and -2 exist', async () => {
      const checkExists = jest
        .fn()
        .mockResolvedValueOnce(true) // base exists
        .mockResolvedValueOnce(true) // -2 exists
        .mockResolvedValueOnce(false); // -3 available
      const result = await generateAvailableSlug('acme-corp', checkExists);
      expect(result).toBe('acme-corp-3');
      expect(checkExists).toHaveBeenCalledTimes(3);
    });

    it('should throw error if all attempts exhausted', async () => {
      const checkExists = jest.fn().mockResolvedValue(true); // All exist
      await expect(
        generateAvailableSlug('acme-corp', checkExists, 3),
      ).rejects.toThrow('Could not generate available slug');
      expect(checkExists).toHaveBeenCalledTimes(3); // base, -2, -3
    });

    it('should handle truncation when candidate exceeds 48 chars', async () => {
      const longBase = 'a'.repeat(46); // 46 chars
      const checkExists = jest
        .fn()
        .mockResolvedValueOnce(true) // base exists
        .mockResolvedValueOnce(false); // truncated -2 available
      const result = await generateAvailableSlug(longBase, checkExists);
      // Should truncate to fit -2 suffix
      expect(result.length).toBeLessThanOrEqual(48);
      expect(result).toMatch(/-2$/);
    });

    it('should validate base slug before checking', async () => {
      const checkExists = jest.fn();
      await expect(
        generateAvailableSlug('ab', checkExists), // Too short
      ).rejects.toThrow('Invalid base slug');
      expect(checkExists).not.toHaveBeenCalled();
    });

    it('should respect maxAttempts parameter', async () => {
      const checkExists = jest.fn().mockResolvedValue(true);
      await expect(
        generateAvailableSlug('acme-corp', checkExists, 5),
      ).rejects.toThrow('Could not generate available slug');
      expect(checkExists).toHaveBeenCalledTimes(5); // base + 4 attempts
    });
  });
});


