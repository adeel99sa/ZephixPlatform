import { Injectable, Optional, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

export type UserAppPreferences = {
  theme: string;
  timezone?: string;
  timezoneAuto?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  language?: string;
  weekStartsOn?: string;
  timeFormat?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @Optional()
    @InjectRepository(User)
    private userRepository?: Repository<User>,
    @Optional()
    @InjectRepository(UserSettings)
    private userSettingsRepository?: Repository<UserSettings>,
  ) {}

  private checkDatabaseAvailability() {
    if (!this.userRepository) {
      throw new Error(
        'Users service temporarily unavailable. Database not configured.',
      );
    }
  }

  private checkUserSettingsAvailability() {
    if (!this.userSettingsRepository) {
      throw new Error(
        'Users service temporarily unavailable. Database not configured.',
      );
    }
  }

  async findById(id: string): Promise<User | null> {
    this.checkDatabaseAvailability();
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    this.checkDatabaseAvailability();
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    this.checkDatabaseAvailability();
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    this.checkDatabaseAvailability();
    await this.userRepository.update(id, userData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    this.checkDatabaseAvailability();
    const result = await this.userRepository.delete(id);
    return (result.affected ?? 0) > 0;
  } // <- This closing brace was missing

  async findByOrganization(organizationId: string): Promise<User[]> {
    this.checkDatabaseAvailability();
    return this.userRepository.find({
      where: { organizationId, isActive: true },
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
      order: { firstName: 'ASC' },
    });
  }

  async getAppPreferences(
    userId: string,
    organizationId: string | null | undefined,
  ): Promise<UserAppPreferences> {
    this.checkDatabaseAvailability();
    this.checkUserSettingsAvailability();
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    let row = await this.userSettingsRepository.findOne({
      where: { userId, organizationId },
    });
    if (!row) {
      row = this.userSettingsRepository.create({
        userId,
        organizationId,
        preferences: {},
        notifications: {},
        theme: 'light',
      });
      await this.userSettingsRepository.save(row);
    }

    const prefs = (row.preferences || {}) as Record<string, unknown>;
    const out: UserAppPreferences = {
      theme: row.theme || 'light',
      language: 'en',
    };
    if (typeof prefs.timezone === 'string') {
      out.timezone = prefs.timezone;
    }
    if (typeof prefs.timezoneAuto === 'boolean') {
      out.timezoneAuto = prefs.timezoneAuto;
    } else {
      out.timezoneAuto = true;
    }
    if (typeof prefs.dateFormat === 'string') {
      out.dateFormat = prefs.dateFormat;
    }
    if (typeof prefs.numberFormat === 'string') {
      out.numberFormat = prefs.numberFormat;
    }
    if (typeof prefs.language === 'string') {
      out.language = prefs.language;
    }
    if (typeof prefs.weekStartsOn === 'string') {
      out.weekStartsOn = prefs.weekStartsOn;
    }
    if (typeof prefs.timeFormat === 'string') {
      out.timeFormat = prefs.timeFormat;
    }
    return out;
  }

  async updateAppPreferences(
    userId: string,
    organizationId: string | null | undefined,
    dto: UpdatePreferencesDto,
  ): Promise<UserAppPreferences> {
    this.checkDatabaseAvailability();
    this.checkUserSettingsAvailability();
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    let row = await this.userSettingsRepository.findOne({
      where: { userId, organizationId },
    });
    if (!row) {
      row = this.userSettingsRepository.create({
        userId,
        organizationId,
        preferences: {},
        notifications: {},
        theme: 'light',
      });
    }

    if (dto.theme !== undefined) {
      row.theme = dto.theme;
    }

    const prefs = { ...((row.preferences as Record<string, unknown>) || {}) };
    for (const legacy of [
      'defaultView',
      'defaultTaskGrouping',
      'highContrast',
      'notifyTimezoneChange',
    ] as const) {
      delete prefs[legacy];
    }
    if (dto.timezone !== undefined) {
      prefs.timezone = dto.timezone;
    }
    if (dto.timezoneAuto !== undefined) {
      prefs.timezoneAuto = dto.timezoneAuto;
    }
    if (dto.dateFormat !== undefined) {
      prefs.dateFormat = dto.dateFormat;
    }
    if (dto.numberFormat !== undefined) {
      prefs.numberFormat = dto.numberFormat;
    }
    if (dto.language !== undefined) {
      prefs.language = dto.language;
    }
    if (dto.weekStartsOn !== undefined) {
      prefs.weekStartsOn = dto.weekStartsOn;
    }
    if (dto.timeFormat !== undefined) {
      prefs.timeFormat = dto.timeFormat;
    }
    row.preferences = prefs;

    await this.userSettingsRepository.save(row);
    return this.getAppPreferences(userId, organizationId);
  }
}
