import { Injectable, Optional, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

export type UserAppPreferences = {
  theme: string;
  timezone?: string;
  dateFormat?: string;
  defaultView?: string;
  language?: string;
  highContrast?: boolean;
  notifyTimezoneChange?: boolean;
  weekStartsOn?: string;
  timeFormat?: string;
  defaultTaskGrouping?: string;
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
    };
    if (typeof prefs.timezone === 'string') {
      out.timezone = prefs.timezone;
    }
    if (typeof prefs.dateFormat === 'string') {
      out.dateFormat = prefs.dateFormat;
    }
    if (typeof prefs.defaultView === 'string') {
      out.defaultView = prefs.defaultView;
    }
    if (typeof prefs.language === 'string') {
      out.language = prefs.language;
    }
    if (typeof prefs.highContrast === 'boolean') {
      out.highContrast = prefs.highContrast;
    }
    if (typeof prefs.notifyTimezoneChange === 'boolean') {
      out.notifyTimezoneChange = prefs.notifyTimezoneChange;
    }
    if (typeof prefs.weekStartsOn === 'string') {
      out.weekStartsOn = prefs.weekStartsOn;
    }
    if (typeof prefs.timeFormat === 'string') {
      out.timeFormat = prefs.timeFormat;
    }
    if (typeof prefs.defaultTaskGrouping === 'string') {
      out.defaultTaskGrouping = prefs.defaultTaskGrouping;
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
    if (dto.timezone !== undefined) {
      prefs.timezone = dto.timezone;
    }
    if (dto.dateFormat !== undefined) {
      prefs.dateFormat = dto.dateFormat;
    }
    if (dto.defaultView !== undefined) {
      prefs.defaultView = dto.defaultView;
    }
    if (dto.language !== undefined) {
      prefs.language = dto.language;
    }
    if (dto.highContrast !== undefined) {
      prefs.highContrast = dto.highContrast;
    }
    if (dto.notifyTimezoneChange !== undefined) {
      prefs.notifyTimezoneChange = dto.notifyTimezoneChange;
    }
    if (dto.weekStartsOn !== undefined) {
      prefs.weekStartsOn = dto.weekStartsOn;
    }
    if (dto.timeFormat !== undefined) {
      prefs.timeFormat = dto.timeFormat;
    }
    if (dto.defaultTaskGrouping !== undefined) {
      prefs.defaultTaskGrouping = dto.defaultTaskGrouping;
    }
    row.preferences = prefs;

    await this.userSettingsRepository.save(row);
    return this.getAppPreferences(userId, organizationId);
  }
}
