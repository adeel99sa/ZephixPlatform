/**
 * Resource Management Settings
 * Configuration for organization-level resource allocation thresholds
 */
export interface ResourceManagementSettings {
  /**
   * Warning threshold percentage (default: 80)
   * When total allocation exceeds this, show a warning
   */
  warningThreshold: number;

  /**
   * Critical threshold percentage (default: 100)
   * When total allocation exceeds this, show a critical warning
   */
  criticalThreshold: number;

  /**
   * Hard cap percentage (default: 150)
   * Maximum allowed allocation percentage (blocks allocation if exceeded)
   */
  hardCap: number;

  /**
   * Require justification above this percentage (default: 100)
   * Allocations above this threshold require a justification field
   */
  requireJustificationAbove: number;
}

/**
 * Default resource management settings
 */
export const DEFAULT_RESOURCE_MANAGEMENT_SETTINGS: ResourceManagementSettings =
  {
    warningThreshold: 80,
    criticalThreshold: 100,
    hardCap: 150,
    requireJustificationAbove: 100,
  };

