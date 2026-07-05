import type { AttributeDataType } from './attributes.types';

/** Normalize value_json shapes from API into UI-friendly values. */
export function normalizeAttributeValueFromApi(
  dataType: AttributeDataType,
  value: unknown,
): unknown {
  if (value === null || value === undefined) return null;
  if (dataType === 'multi_select') {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && Array.isArray((value as { values?: unknown }).values)) {
      return (value as { values: unknown[] }).values;
    }
  }
  if (dataType === 'people') {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && Array.isArray((value as { userIds?: unknown }).userIds)) {
      return (value as { userIds: unknown[] }).userIds;
    }
  }
  return value;
}

/** Serialize UI values for PUT /tasks/:id/attributes/:defId. */
export function serializeAttributeValueForApi(
  dataType: AttributeDataType,
  value: unknown,
): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (dataType === 'multi_select' && Array.isArray(value)) {
    return { values: value };
  }
  if (dataType === 'people' && Array.isArray(value)) {
    return { userIds: value };
  }
  return value;
}

export function compareAttributeValues(
  dataType: AttributeDataType,
  a: unknown,
  b: unknown,
): number {
  const emptyA = a === null || a === undefined || a === '';
  const emptyB = b === null || b === undefined || b === '';
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  const norm = (v: unknown) => normalizeAttributeValueFromApi(dataType, v);

  switch (dataType) {
    case 'integer':
    case 'decimal':
    case 'number':
    case 'currency':
    case 'percentage':
    case 'rating':
    case 'duration':
      return Number(norm(a)) - Number(norm(b));
    case 'boolean':
      return Number(Boolean(norm(a))) - Number(Boolean(norm(b)));
    case 'date':
    case 'datetime':
      return String(norm(a)).localeCompare(String(norm(b)));
    case 'multi_select':
    case 'people': {
      const arrA = norm(a) as unknown[];
      const arrB = norm(b) as unknown[];
      return arrA.join(',').localeCompare(arrB.join(','));
    }
    default:
      return String(norm(a)).localeCompare(String(norm(b)), undefined, { numeric: true });
  }
}
