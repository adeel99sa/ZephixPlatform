/**
 * Slug Utility
 *
 * Provides slug generation, validation, and collision handling for organization slugs.
 * Used in Phase 1 for deterministic, secure slug management.
 */

const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  'www',
  'app',
  'zephix',
  'support',
  'status',
];

/**
 * Validates an organization slug according to Phase 1 rules:
 * - lowercase letters, numbers, hyphen only
 * - length 3 to 48
 * - no leading or trailing hyphen
 * - not a reserved slug
 */
export function validateOrgSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug must be a non-empty string' };
  }

  // Length check
  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters long' };
  }
  if (slug.length > 48) {
    return { valid: false, error: 'Slug must be at most 48 characters long' };
  }

  // Character check: only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      error: 'Slug can only contain lowercase letters, numbers, and hyphens',
    };
  }

  // No leading or trailing hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return {
      valid: false,
      error: 'Slug cannot start or end with a hyphen',
    };
  }

  // Reserved slug check
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
    return {
      valid: false,
      error: `Slug "${slug}" is reserved and cannot be used`,
    };
  }

  return { valid: true };
}

/**
 * Generates a slug from an organization name.
 *
 * Rules:
 * - Convert to lowercase
 * - Replace non-alphanumeric characters with hyphens
 * - Collapse multiple hyphens into one
 * - Remove leading/trailing hyphens
 * - Truncate to 48 characters if needed
 */
export function slugify(orgName: string): string {
  if (!orgName || typeof orgName !== 'string') {
    return '';
  }

  let slug = orgName
    .toLowerCase()
    .trim()
    // Replace non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse multiple hyphens into one
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '');

  // Truncate to 48 characters (max length)
  if (slug.length > 48) {
    slug = slug.substring(0, 48);
    // Remove trailing hyphen if truncation created one
    slug = slug.replace(/-$/, '');
  }

  return slug;
}

/**
 * Generates a deterministic slug with suffix retry logic.
 *
 * If the base slug exists, appends -2, -3, etc. up to maxAttempts.
 * This is deterministic and testable (not random).
 *
 * @param baseSlug - The base slug to use
 * @param checkExists - Function to check if slug exists (returns Promise<boolean>)
 * @param maxAttempts - Maximum number of attempts (default: 10)
 * @returns Promise<string> - Available slug
 */
export async function generateAvailableSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>,
  maxAttempts: number = 10,
): Promise<string> {
  // Validate base slug first
  const validation = validateOrgSlug(baseSlug);
  if (!validation.valid) {
    throw new Error(`Invalid base slug: ${validation.error}`);
  }

  // Check base slug
  const baseExists = await checkExists(baseSlug);
  if (!baseExists) {
    return baseSlug;
  }

  // Try with suffix -2, -3, etc.
  for (let i = 2; i <= maxAttempts; i++) {
    const candidate = `${baseSlug}-${i}`;

    // Validate candidate (length check)
    if (candidate.length > 48) {
      // If candidate is too long, truncate base slug
      const truncatedBase = baseSlug.substring(0, 48 - (i.toString().length + 1));
      const truncatedCandidate = `${truncatedBase}-${i}`;
      const exists = await checkExists(truncatedCandidate);
      if (!exists) {
        return truncatedCandidate;
      }
    } else {
      const exists = await checkExists(candidate);
      if (!exists) {
        return candidate;
      }
    }
  }

  // If all attempts failed, throw error
  throw new Error(
    `Could not generate available slug after ${maxAttempts} attempts for base: ${baseSlug}`,
  );
}


