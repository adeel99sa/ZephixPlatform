import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecuritySettings } from '../../organizations/entities/security-settings.entity';

@Injectable()
export class SecuritySettingsService {
  private readonly logger = new Logger(SecuritySettingsService.name);

  constructor(
    @InjectRepository(SecuritySettings)
    private readonly repo: Repository<SecuritySettings>,
  ) {}

  async getForOrg(organizationId: string): Promise<SecuritySettings> {
    let settings = await this.repo.findOne({ where: { organizationId } });
    if (!settings) {
      this.logger.log(
        `Creating default security settings for org ${organizationId}`,
      );
      settings = this.repo.create({
        organizationId,
        twoFactorEnabled: false,
        sessionTimeout: 480,
        passwordPolicy: {
          minLength: 8,
          requireNumbers: true,
          requireSymbols: true,
          requireUppercase: true,
        },
        ipWhitelist: null,
        maxFailedAttempts: 5,
        lockoutDuration: 30,
      });
      await this.repo.save(settings);
    }
    return settings;
  }

  async updateForOrg(
    organizationId: string,
    updates: Partial<{
      twoFactorEnabled: boolean;
      sessionTimeout: number;
      passwordPolicy: Record<string, any>;
      ipWhitelist: string[] | null;
      maxFailedAttempts: number;
      lockoutDuration: number;
    }>,
  ): Promise<SecuritySettings> {
    const settings = await this.getForOrg(organizationId);

    if (updates.passwordPolicy) {
      updates.passwordPolicy = {
        ...(settings.passwordPolicy as any),
        ...updates.passwordPolicy,
      };
    }

    Object.assign(settings, updates);
    return this.repo.save(settings);
  }
}
