/**
 * Response Format Helper
 *
 * Enforces standardized { data: T } response format across all controllers.
 * This prevents response format drift and ensures consistency.
 *
 * Usage:
 *   return formatResponse(workspaces); // Returns { data: workspaces }
 *   return formatResponse(null); // Returns { data: null }
 *   return formatResponse([]); // Returns { data: [] }
 */

/**
 * Format response data into standardized { data: T } format
 *
 * @param data - The data to wrap (can be any type including null, array, object)
 * @returns Standardized response object with { data: T }
 */
export function formatResponse<T>(data: T): { data: T } {
  return { data };
}

/**
 * Format array response with safe defaults
 *
 * @param items - Array of items (can be null/undefined)
 * @returns Standardized response with empty array default
 */
export function formatArrayResponse<T>(items: T[] | null | undefined): {
  data: T[];
} {
  return { data: items || [] };
}

/**
 * Format paginated response with safe defaults
 *
 * @param items - Array of items
 * @param total - Total count
 * @param page - Current page (default: 1)
 * @param totalPages - Total pages (default: 0)
 * @returns Standardized paginated response
 */
export function formatPaginatedResponse<T>(
  items: T[] | null | undefined,
  total: number = 0,
  page: number = 1,
  totalPages: number = 0,
): {
  data: { projects: T[]; total: number; page: number; totalPages: number };
} {
  return {
    data: {
      projects: items || [],
      total: total || 0,
      page: page || 1,
      totalPages: totalPages || 0,
    },
  };
}

/**
 * Format stats response with zeroed defaults
 *
 * @param stats - Stats object (can be partial)
 * @param defaults - Default values for missing stats
 * @returns Standardized stats response
 */
export function formatStatsResponse<T extends Record<string, number>>(
  stats: Partial<T> | null | undefined,
  defaults: T,
): { data: T } {
  return {
    data: { ...defaults, ...(stats || {}) } as T,
  };
}
