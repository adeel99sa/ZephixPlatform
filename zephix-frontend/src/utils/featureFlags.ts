export interface FeatureFlags {
  approvals: boolean;      // Toggles Approvals Queue and decision API calls
  sessions: boolean;       // Toggles Sessions page
  auditExport: boolean;    // Toggles CSV and JSON export buttons
}

const defaultFlags: FeatureFlags = {
  approvals: true,
  sessions: true,
  auditExport: false
};

export class FeatureFlagService {
  private static flags: FeatureFlags = defaultFlags;
  
  static initialize(flags: Partial<FeatureFlags> = {}) {
    this.flags = { ...defaultFlags, ...flags };
  }
  
  static isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }
  
  static getFlags(): FeatureFlags {
    return { ...this.flags };
  }
}

