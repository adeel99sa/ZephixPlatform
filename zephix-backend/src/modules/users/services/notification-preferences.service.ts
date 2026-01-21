import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from '../entities/user-settings.entity';

export interface NotificationPreferences {
  version: number; // Schema version for migration support
  channels: {
    inApp: boolean;
    email: boolean;
    slack: boolean;
    teams: boolean;
  };
  categories: {
    invites: boolean;
    mentions: boolean;
    assignments: boolean;
    accessChanges: boolean;
    riskAlerts: boolean;
    workflow: boolean;
  };
  emailDigest: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    quietHours: {
      enabled: boolean;
      start: string; // HH:mm format
      end: string; // HH:mm format
    };
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  version: 1, // Current schema version
  channels: {
    inApp: true,
    email: true,
    slack: false,
    teams: false,
  },
  categories: {
    invites: true,
    mentions: true,
    assignments: true,
    accessChanges: true,
    riskAlerts: true,
    workflow: true,
  },
  emailDigest: {
    enabled: true,
    frequency: 'immediate',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  },
};

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>,
  ) {}

  /**
   * Get notification preferences with defaults applied
   */
  async getPreferences(
    userId: string,
    organizationId: string,
  ): Promise<NotificationPreferences> {
    let settings = await this.userSettingsRepository.findOne({
      where: { userId, organizationId },
    });

    if (!settings) {
      // Create default settings if none exist
      settings = this.userSettingsRepository.create({
        userId,
        organizationId,
        notifications: {},
      });
      await this.userSettingsRepository.save(settings);
    }

    // Merge stored preferences with defaults
    const stored = (settings.notifications ||
      {}) as Partial<NotificationPreferences>;
    return this.mergeWithDefaults(stored);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    organizationId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    let settings = await this.userSettingsRepository.findOne({
      where: { userId, organizationId },
    });

    if (!settings) {
      settings = this.userSettingsRepository.create({
        userId,
        organizationId,
        notifications: {},
      });
    }

    // Get current preferences with defaults
    const current = await this.getPreferences(userId, organizationId);

    // Deep merge updates
    const merged: NotificationPreferences = {
      version: DEFAULT_PREFERENCES.version, // Always use current version
      channels: { ...current.channels, ...updates.channels },
      categories: { ...current.categories, ...updates.categories },
      emailDigest: {
        ...current.emailDigest,
        ...updates.emailDigest,
        quietHours: {
          ...current.emailDigest.quietHours,
          ...updates.emailDigest?.quietHours,
        },
      },
    };

    // Validate merged preferences
    this.validatePreferences(merged);

    // Store merged preferences
    settings.notifications = merged;
    await this.userSettingsRepository.save(settings);

    return merged;
  }

  /**
   * Merge stored preferences with defaults
   */
  private mergeWithDefaults(
    stored: Partial<NotificationPreferences>,
  ): NotificationPreferences {
    return {
      version: DEFAULT_PREFERENCES.version,
      channels: {
        ...DEFAULT_PREFERENCES.channels,
        ...stored.channels,
      },
      categories: {
        ...DEFAULT_PREFERENCES.categories,
        ...stored.categories,
      },
      emailDigest: {
        ...DEFAULT_PREFERENCES.emailDigest,
        ...stored.emailDigest,
        quietHours: {
          ...DEFAULT_PREFERENCES.emailDigest.quietHours,
          ...stored.emailDigest?.quietHours,
        },
      },
    };
  }

  /**
   * Validate preferences structure
   */
  private validatePreferences(prefs: NotificationPreferences): void {
    // Validate channels
    if (typeof prefs.channels?.inApp !== 'boolean') {
      throw new Error('channels.inApp must be boolean');
    }
    if (typeof prefs.channels?.email !== 'boolean') {
      throw new Error('channels.email must be boolean');
    }

    // Validate categories
    const categoryKeys = [
      'invites',
      'mentions',
      'assignments',
      'accessChanges',
      'riskAlerts',
      'workflow',
    ];
    for (const key of categoryKeys) {
      if (typeof prefs.categories?.[key] !== 'boolean') {
        throw new Error(`categories.${key} must be boolean`);
      }
    }

    // Validate email digest
    if (
      !['immediate', 'daily', 'weekly'].includes(prefs.emailDigest?.frequency)
    ) {
      throw new Error(
        'emailDigest.frequency must be immediate, daily, or weekly',
      );
    }
  }
}
