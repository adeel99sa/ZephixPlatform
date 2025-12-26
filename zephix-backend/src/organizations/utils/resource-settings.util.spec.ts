import { Organization } from '../entities/organization.entity';
import { getResourceSettings } from './resource-settings.util';
import {
  DEFAULT_RESOURCE_MANAGEMENT_SETTINGS,
} from '../interfaces/resource-management-settings.interface';

describe('getResourceSettings', () => {
  it('should return pure defaults when no settings in JSON', () => {
    const org = new Organization();
    org.settings = {};

    const settings = getResourceSettings(org);

    expect(settings.warningThreshold).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.warningThreshold,
    );
    expect(settings.criticalThreshold).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.criticalThreshold,
    );
    expect(settings.hardCap).toBe(DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.hardCap);
    expect(settings.requireJustificationAbove).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.requireJustificationAbove,
    );
  });

  it('should return mix of override and defaults for partial settings', () => {
    const org = new Organization();
    org.settings = {
      resourceManagementSettings: {
        warningThreshold: 75,
        // Other fields not provided
      },
    };

    const settings = getResourceSettings(org);

    expect(settings.warningThreshold).toBe(75); // Override
    expect(settings.criticalThreshold).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.criticalThreshold,
    ); // Default
    expect(settings.hardCap).toBe(DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.hardCap); // Default
    expect(settings.requireJustificationAbove).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.requireJustificationAbove,
    ); // Default
  });

  it('should return all overrides when all settings provided', () => {
    const org = new Organization();
    org.settings = {
      resourceManagementSettings: {
        warningThreshold: 70,
        criticalThreshold: 90,
        hardCap: 140,
        requireJustificationAbove: 95,
      },
    };

    const settings = getResourceSettings(org);

    expect(settings.warningThreshold).toBe(70);
    expect(settings.criticalThreshold).toBe(90);
    expect(settings.hardCap).toBe(140);
    expect(settings.requireJustificationAbove).toBe(95);
  });

  it('should handle null settings gracefully', () => {
    const org = new Organization();
    org.settings = null as any;

    const settings = getResourceSettings(org);

    expect(settings.warningThreshold).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.warningThreshold,
    );
    expect(settings.criticalThreshold).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.criticalThreshold,
    );
  });

  it('should handle undefined resourceManagementSettings', () => {
    const org = new Organization();
    org.settings = {
      someOtherSetting: 'value',
    };

    const settings = getResourceSettings(org);

    expect(settings.warningThreshold).toBe(
      DEFAULT_RESOURCE_MANAGEMENT_SETTINGS.warningThreshold,
    );
  });
});



