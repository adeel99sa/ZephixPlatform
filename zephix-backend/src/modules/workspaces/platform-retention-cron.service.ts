import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from '../../organizations/entities/organization.entity';
import { PlatformTrashAdminService } from './platform-trash-admin.service';

/**
 * Scheduled retention purge. Disabled unless RETENTION_PURGE_CRON_ENABLED=1.
 * Uses the same purge path as POST /admin/trash/purge (no dependency on admin HTTP).
 */
@Injectable()
export class PlatformRetentionCronService {
  private readonly logger = new Logger(PlatformRetentionCronService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly platformTrashAdmin: PlatformTrashAdminService,
  ) {}

  @Cron(process.env.RETENTION_PURGE_CRON_EXPRESSION || '0 3 * * *')
  async runScheduledRetentionPurge(): Promise<void> {
    if (process.env.RETENTION_PURGE_CRON_ENABLED !== '1') {
      return;
    }

    const orgs = await this.orgRepo.find({ select: ['id'] });
    for (const { id } of orgs) {
      try {
        const result = await this.platformTrashAdmin.purgeStaleTrash(
          id,
          '00000000-0000-0000-0000-000000000000',
          undefined,
          'scheduled_job',
        );
        if (result.workspacesPurged > 0 || result.projectsPurged > 0) {
          this.logger.log({
            action: 'retention_purge_org',
            organizationId: id,
            workspacesPurged: result.workspacesPurged,
            projectsPurged: result.projectsPurged,
          });
        }
      } catch (err) {
        this.logger.warn(
          `retention_purge_org_failed org=${id} ${(err as Error).message}`,
        );
      }
    }
  }
}
