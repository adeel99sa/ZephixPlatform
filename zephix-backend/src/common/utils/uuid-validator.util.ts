import { validate as isUuid } from 'uuid';

/**
 * Validates if a value is a valid UUID
 * @param value - Value to validate
 * @returns true if value is a valid UUID, false otherwise
 */
export function isValidUuid(value: unknown): boolean {
  if (!value) return false;
  if (typeof value !== 'string') return false;
  return isUuid(value.trim());
}

/**
 * Extracts and validates UUID from various sources
 * @param candidate - Value that might be a UUID (string, array, etc.)
 * @returns Valid UUID string or undefined
 */
export function extractValidUuid(candidate: unknown): string | undefined {
  if (!candidate) return undefined;

  const value = Array.isArray(candidate) ? candidate[0] : String(candidate).trim();

  if (!isValidUuid(value)) {
    return undefined;
  }

  return value;
}

