/**
 * Type Safety Utilities
 * 
 * This file provides utilities to help migrate from 'any' types to proper TypeScript types
 * without breaking existing functionality.
 */

import { 
  ApiResponse, 
  User, 
  Workspace, 
  Project, 
  Task, 
  Resource,
  LegacyAny,
  safeAssert
} from '../types/global';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for User objects
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'firstName' in value &&
    'lastName' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).email === 'string'
  );
}

/**
 * Type guard for Workspace objects
 */
export function isWorkspace(value: unknown): value is Workspace {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'organizationId' in value &&
    typeof (value as Workspace).id === 'string' &&
    typeof (value as Workspace).name === 'string'
  );
}

/**
 * Type guard for Project objects
 */
export function isProject(value: unknown): value is Project {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'status' in value &&
    'organizationId' in value &&
    'workspaceId' in value &&
    typeof (value as Project).id === 'string' &&
    typeof (value as Project).name === 'string'
  );
}

/**
 * Type guard for Task objects
 */
export function isTask(value: unknown): value is Task {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value &&
    'projectId' in value &&
    'workspaceId' in value &&
    typeof (value as Task).id === 'string' &&
    typeof (value as Task).title === 'string'
  );
}

/**
 * Type guard for Resource objects
 */
export function isResource(value: unknown): value is Resource {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'capacity' in value &&
    'workspaceId' in value &&
    typeof (value as Resource).id === 'string' &&
    typeof (value as Resource).name === 'string'
  );
}

/**
 * Type guard for arrays
 */
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }
  
  if (itemGuard) {
    return value.every(itemGuard);
  }
  
  return true;
}

// ============================================================================
// SAFE TYPE CONVERSION
// ============================================================================

/**
 * Safely convert unknown to User, with fallback
 */
export function safeToUser(value: unknown): User | null {
  if (isUser(value)) {
    return value;
  }
  
  // Try to extract basic user info from partial objects
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.id && obj.email) {
      return {
        id: String(obj.id),
        email: String(obj.email),
        firstName: String(obj.firstName || ''),
        lastName: String(obj.lastName || ''),
        role: String(obj.role || 'user'),
        organizationId: String(obj.organizationId || ''),
        organizationRole: (obj.organizationRole as 'admin' | 'member' | 'viewer') || 'member',
        currentWorkspaceId: obj.currentWorkspaceId ? String(obj.currentWorkspaceId) : undefined,
        isActive: Boolean(obj.isActive ?? true),
        isEmailVerified: Boolean(obj.isEmailVerified ?? false),
        profilePicture: obj.profilePicture ? String(obj.profilePicture) : undefined,
        lastLoginAt: obj.lastLoginAt ? String(obj.lastLoginAt) : undefined,
        createdAt: String(obj.createdAt || new Date().toISOString()),
        updatedAt: String(obj.updatedAt || new Date().toISOString())
      };
    }
  }
  
  return null;
}

/**
 * Safely convert unknown to Workspace, with fallback
 */
export function safeToWorkspace(value: unknown): Workspace | null {
  if (isWorkspace(value)) {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.id && obj.name) {
      return {
        id: String(obj.id),
        name: String(obj.name),
        description: obj.description ? String(obj.description) : undefined,
        organizationId: String(obj.organizationId || ''),
        ownerId: String(obj.ownerId || ''),
        isActive: Boolean(obj.isActive ?? true),
        settings: obj.settings as any || {},
        createdAt: String(obj.createdAt || new Date().toISOString()),
        updatedAt: String(obj.updatedAt || new Date().toISOString())
      };
    }
  }
  
  return null;
}

/**
 * Safely convert unknown to Project, with fallback
 */
export function safeToProject(value: unknown): Project | null {
  if (isProject(value)) {
    return value;
  }
  
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.id && obj.name) {
      return {
        id: String(obj.id),
        name: String(obj.name),
        description: obj.description ? String(obj.description) : undefined,
        status: (obj.status as any) || 'planning',
        priority: (obj.priority as any) || 'medium',
        startDate: String(obj.startDate || new Date().toISOString()),
        endDate: String(obj.endDate || new Date().toISOString()),
        organizationId: String(obj.organizationId || ''),
        workspaceId: String(obj.workspaceId || ''),
        createdBy: String(obj.createdBy || ''),
        assignedTo: Array.isArray(obj.assignedTo) ? obj.assignedTo.map(String) : undefined,
        tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
        budget: typeof obj.budget === 'number' ? obj.budget : undefined,
        progress: typeof obj.progress === 'number' ? obj.progress : 0,
        createdAt: String(obj.createdAt || new Date().toISOString()),
        updatedAt: String(obj.updatedAt || new Date().toISOString())
      };
    }
  }
  
  return null;
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

/**
 * Safely extract data from API response
 */
export function safeExtractData<T>(response: unknown): T | null {
  if (typeof response === 'object' && response !== null) {
    const obj = response as Record<string, unknown>;
    
    // Check if it's an API response with data property
    if ('data' in obj) {
      return obj.data as T;
    }
    
    // Check if it's an API response with success property
    if ('success' in obj && obj.success === true && 'data' in obj) {
      return obj.data as T;
    }
    
    // If it's already the data itself
    return obj as T;
  }
  
  return null;
}

/**
 * Safely extract array data from API response
 */
export function safeExtractArray<T>(response: unknown, itemGuard?: (item: unknown) => item is T): T[] {
  const data = safeExtractData<T[]>(response);
  
  if (Array.isArray(data)) {
    if (itemGuard) {
      return data.filter(itemGuard);
    }
    return data;
  }
  
  return [];
}

/**
 * Safely extract paginated data from API response
 */
export function safeExtractPaginatedData<T>(response: unknown): {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
} {
  const data = safeExtractData<{
    data: T[];
    pagination?: any;
  }>(response);
  
  if (data && Array.isArray(data.data)) {
    return {
      data: data.data,
      pagination: data.pagination
    };
  }
  
  return { data: [] };
}

// ============================================================================
// LEGACY COMPATIBILITY HELPERS
// ============================================================================

/**
 * Legacy helper to safely access nested properties
 * @deprecated Use proper typing instead
 */
export function safeGet<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
  try {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Legacy helper to safely call functions
 * @deprecated Use proper typing instead
 */
export function safeCall<T = any>(fn: any, ...args: any[]): T | undefined {
  try {
    if (typeof fn === 'function') {
      return fn(...args);
    }
  } catch (error) {
    console.warn('Safe call failed:', error);
  }
  
  return undefined;
}

/**
 * Legacy helper to safely stringify objects
 * @deprecated Use proper typing instead
 */
export function safeStringify(obj: any, space?: number): string {
  try {
    return JSON.stringify(obj, null, space);
  } catch {
    return '[Circular or Invalid Object]';
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Helper to gradually migrate from 'any' to proper types
 * This function provides a bridge during migration
 */
export function migrateFromAny<T>(value: any, targetType: 'User' | 'Workspace' | 'Project' | 'Task' | 'Resource'): T | null {
  switch (targetType) {
    case 'User':
      return safeToUser(value) as T;
    case 'Workspace':
      return safeToWorkspace(value) as T;
    case 'Project':
      return safeToProject(value) as T;
    case 'Task':
      // Add task conversion logic here
      return null;
    case 'Resource':
      // Add resource conversion logic here
      return null;
    default:
      return null;
  }
}

/**
 * Helper to create type-safe wrappers for existing functions
 */
export function createTypeSafeWrapper<TInput, TOutput>(
  fn: (input: any) => any,
  inputValidator: (input: unknown) => input is TInput,
  outputValidator: (output: unknown) => output is TOutput
): (input: TInput) => TOutput | null {
  return (input: TInput) => {
    if (!inputValidator(input)) {
      console.warn('Invalid input provided to type-safe wrapper');
      return null;
    }
    
    try {
      const result = fn(input);
      if (outputValidator(result)) {
        return result;
      }
      
      console.warn('Function returned invalid output type');
      return null;
    } catch (error) {
      console.error('Function execution failed:', error);
      return null;
    }
  };
}

// ============================================================================
// DEBUGGING HELPERS
// ============================================================================

/**
 * Debug helper to log type information
 */
export function debugType(value: unknown, label?: string): void {
  if (process.env.NODE_ENV === 'development') {
    const type = typeof value;
    const isArray = Array.isArray(value);
    const isObject = type === 'object' && value !== null;
    
    console.log(`[Type Debug${label ? ` - ${label}` : ''}]:`, {
      type: isArray ? 'array' : type,
      isObject,
      isArray,
      keys: isObject && !isArray ? Object.keys(value as object) : undefined,
      length: isArray ? (value as unknown[]).length : undefined,
      value: isObject ? '[Object]' : value
    });
  }
}

/**
 * Debug helper to validate API responses
 */
export function debugApiResponse(response: unknown, endpoint?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API Debug${endpoint ? ` - ${endpoint}` : ''}]:`, {
      hasSuccess: 'success' in (response as any),
      hasData: 'data' in (response as any),
      hasError: 'error' in (response as any),
      response
    });
  }
}
