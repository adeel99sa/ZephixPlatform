import { Organization } from '../entities/organization.entity';
import {
  ResourceManagementSettings,
  DEFAULT_RESOURCE_MANAGEMENT_SETTINGS,
} from '../interfaces/resource-management-settings.interface';

/**
 * Get resource management settings for an organization
 * Reads org.settings.resourceManagementSettings and merges with defaults
 *
 * This is a pure utility function without NestJS dependencies
 * that can be used in domain logic or services
 */
export function getResourceSettings(
  org: Organization,
): ResourceManagementSettings {
  const settings = org.settings as any;
  const resourceSettings = settings?.resourceManagementSettings || {};

  return {
    warningThreshold:
      resourceSettings.warningThreshold ??
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.warningThreshold,
    criticalThreshold:
      resourceSettings.criticalThreshold ??
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.criticalThreshold,
    hardCap:
      resourceSettings.hardCap ?? DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.hardCap,
    requireJustificationAbove:
      resourceSettings.requireJustificationAbove ??
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.requireJustificationAbove,
  };
}

