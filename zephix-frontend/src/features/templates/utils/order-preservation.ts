/**
 * Order preservation guard for template arrays
 * Prevents accidental sorting of API responses
 */

/**
 * Assert that no sorting is applied to template arrays
 * Only runs in development builds
 */
export function assertNoSortUsage<T extends { templateId: string }>(
  array: T[],
  arrayName: string
): void {
  if (import.meta.env.PROD) {
    return; // Skip in production
  }

  // Check if array is sorted by templateId (common mistake)
  const isSortedById = array.every((item, index) => {
    if (index === 0) return true;
    return array[index - 1].templateId <= item.templateId;
  });

  if (isSortedById && array.length > 1) {
    console.warn(
      `[OrderPreservation] ${arrayName} appears to be sorted by templateId. ` +
        `API responses should be rendered in backend order.`
    );
  }
}

/**
 * Get stable key for template items
 * Always use templateId as the React key
 */
export function getTemplateKey(templateId: string): string {
  return templateId;
}

