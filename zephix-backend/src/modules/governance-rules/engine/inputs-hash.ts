import { createHash } from 'crypto';

/**
 * Compute a deterministic hash of evaluation inputs.
 *
 * Normalization rules (for hashing only, not for stored values):
 * - Sort object keys before serialization
 * - Numbers normalized to fixed precision 4 decimal strings
 *   (prevents hash drift from minor serialization differences)
 * - Null and undefined both normalize to null
 * - Hash prefix: 16 chars of SHA-256
 */
export function computeInputsHash(inputs: Record<string, any>): string {
  const normalized = normalizeForHash(inputs);
  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

function normalizeForHash(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value.toFixed(4);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }
  if (typeof value === 'object') {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = normalizeForHash(value[key]);
    }
    return sorted;
  }
  return String(value);
}
