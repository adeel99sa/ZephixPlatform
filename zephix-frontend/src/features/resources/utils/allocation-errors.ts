/**
 * Resource Allocation Error Utilities
 * Helpers for detecting and handling allocation-specific errors
 */

/**
 * Check if an error indicates that justification is required
 *
 * Backend throws BadRequestException with message:
 * "Justification is required for allocations exceeding X%. Projected total: Y%"
 */
export function isJustificationRequiredError(error: any): boolean {
  if (!error) return false;

  // Handle axios errors
  if (error.response?.data) {
    const errorData = error.response.data;

    // Check message field (can be string or nested object)
    const message = typeof errorData.message === 'string'
      ? errorData.message
      : errorData.message?.message || '';

    if (typeof message === 'string') {
      return message.includes('Justification is required') ||
             message.includes('justification is required') ||
             message.toLowerCase().includes('justification required');
    }
  }

  // Handle direct error objects
  if (error.message && typeof error.message === 'string') {
    return error.message.includes('Justification is required') ||
           error.message.includes('justification is required') ||
           error.message.toLowerCase().includes('justification required');
  }

  return false;
}

/**
 * Extract the projected total percentage from a justification error message
 * Useful for displaying context in the modal
 */
export function extractProjectedTotal(error: any): number | null {
  if (!isJustificationRequiredError(error)) return null;

  const message = error.response?.data?.message || error.message || '';
  const match = message.match(/Projected total:\s*(\d+(?:\.\d+)?)%/i);

  if (match && match[1]) {
    return parseFloat(match[1]);
  }

  return null;
}

/**
 * Extract the threshold percentage from a justification error message
 */
export function extractJustificationThreshold(error: any): number | null {
  if (!isJustificationRequiredError(error)) return null;

  const message = error.response?.data?.message || error.message || '';
  const match = message.match(/exceeding\s*(\d+(?:\.\d+)?)%/i);

  if (match && match[1]) {
    return parseFloat(match[1]);
  }

  return null;
}



