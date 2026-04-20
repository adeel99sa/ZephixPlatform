/**
 * SystemBootstrapService — runs on every app startup.
 *
 * Ensures global system data (templates, KPI definitions) exists in the database.
 * Idempotent: skips resources that already exist. Safe to run on every boot.
 * Replaces the need for manual `TEMPLATE_CENTER_SEED_OK=true` seed scripts.
 */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Template } from '../modules/templates/entities/template.entity';
import {
  SYSTEM_TEMPLATE_DEFS,
  ACTIVE_TEMPLATE_CODES,
} from '../modules/templates/data/system-template-definitions';

@Injectable()
export class SystemBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemBootstrapService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Skip if database is unavailable
    if (process.env.SKIP_DATABASE === 'true') return;

    this.logger.log('System bootstrap starting...');
    try {
      await this.ensureSystemTemplatesExist();
      this.logger.log('System bootstrap complete');
    } catch (error) {
      // Log but don't crash — system data may already exist from migrations/seeds
      this.logger.error('System bootstrap error (non-fatal)', error?.message);
    }
  }

  /**
   * Ensure all SYSTEM templates from SYSTEM_TEMPLATE_DEFS exist in the database.
   * Skips templates that already exist (matched by templateCode).
   * Uses the same field mapping as seed-system-templates.ts.
   */
  private async ensureSystemTemplatesExist(): Promise<void> {
    const existingRows = await this.templateRepo
      .createQueryBuilder('t')
      .select(['t.templateCode'])
      .where('t.isSystem = true')
      .getMany();
    const existingCodes = new Set(existingRows.map((r) => r.templateCode).filter(Boolean));

    // Check each defined template individually — don't early-exit based on count
    // because the set of system templates can drift if new ones are added to code.

    // Find a system user to set as createdById — use the first admin user
    let createdById: string | null = null;
    try {
      const [row] = await this.dataSource.query(
        `SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`,
      );
      createdById = row?.id ?? null;
    } catch {
      // No users yet — will be null
    }

    let created = 0;
    for (const def of SYSTEM_TEMPLATE_DEFS) {
      if (existingCodes.has(def.code)) continue;

      // Same field mapping as seed-system-templates.ts lines 208-245
      const template = this.templateRepo.create({
        name: def.name,
        templateCode: def.code,
        description: def.description,
        category: def.category,
        methodology: def.methodology as any,
        deliveryMethod: def.deliveryMethod,
        organizationId: null,
        createdById,
        templateScope: 'SYSTEM' as any,
        isActive: ACTIVE_TEMPLATE_CODES.has(def.code),
        isSystem: true,
        isDefault: false,
        isPublished: true,
        phases: def.phases as any,
        taskTemplates: def.taskTemplates as any,
        riskPresets: (def.riskPresets as any) || [],
        defaultTabs: def.defaultTabs,
        defaultGovernanceFlags: def.defaultGovernanceFlags,
        columnConfig: (def.columnConfig as any) || null,
        workTypeTags: def.workTypeTags,
        metadata: {
          purpose: def.purpose,
          bestFor: def.bestFor,
          defaultColumns: def.defaultColumns,
          requiredArtifacts: def.requiredArtifacts,
          governanceOptions: def.governanceOptions,
          includedViews: def.includedViews,
        } as any,
      });

      await this.templateRepo.save(template);
      created++;
    }

    this.logger.log(
      `System templates: ${created} created, ${existingCodes.size} already existed`,
    );
  }
}
