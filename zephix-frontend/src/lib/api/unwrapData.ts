/**
 * Shared helper to unwrap { data: ... } response format
 *
 * Backend endpoints now return { data: T } format for consistency.
 * This helper safely extracts the data field, with fallback to old format.
 *
 * Usage:
 *   const response = await api.get('/endpoint');
 *   const data = unwrapData<MyType>(response);
 *
 * Handles:
 *   - { data: T } (new format)
 *   - { data: { data: T } } (axios interceptor wrapped)
 *   - T (old format - direct value)
 *   - null/undefined (safe defaults)
 */

export function unwrapData<T>(response: any): T | null {
  if (response === null || response === undefined) {
    return null;
  }

  // Handle axios interceptor wrapped response: { data: { data: T } }
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }

  // Handle new format: { data: T }
  if (response?.data !== undefined) {
    return response.data;
  }

  // Handle old format: T (direct value)
  return response;
}

/**
 * Unwrap data with default value
 */
export function unwrapDataWithDefault<T>(response: any, defaultValue: T): T {
  const data = unwrapData<T>(response);
  return data !== null ? data : defaultValue;
}

/**
 * Unwrap array data with empty array default
 */
export function unwrapArray<T>(response: any): T[] {
  const data = unwrapData<T[]>(response);
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

/**
 * Unwrap paginated data with safe defaults
 */
export function unwrapPaginated<T>(response: any): {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
} {
  const data = unwrapData<{ projects?: T[]; items?: T[]; data?: T[]; total: number; page: number; totalPages: number }>(response);

  if (data && typeof data === 'object') {
    const items = data.projects || data.items || data.data || [];
    return {
      items: Array.isArray(items) ? items : [],
      total: typeof data.total === 'number' ? data.total : 0,
      page: typeof data.page === 'number' ? data.page : 1,
      totalPages: typeof data.totalPages === 'number' ? data.totalPages : 0,
    };
  }

  return {
    items: [],
    total: 0,
    page: 1,
    totalPages: 0,
  };
}



