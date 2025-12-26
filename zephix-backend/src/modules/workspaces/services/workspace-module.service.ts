import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceModuleConfig } from '../entities/workspace-module-config.entity';
import {
  WORKSPACE_MODULES,
  getModuleDefaults,
} from '../modules/workspace-module-registry';

@Injectable()
export class WorkspaceModuleService {
  private readonly logger = new Logger(WorkspaceModuleService.name);

  constructor(
    @InjectRepository(WorkspaceModuleConfig)
    private moduleConfigRepository: Repository<WorkspaceModuleConfig>,
  ) {}

  async getAllModules(workspaceId: string): Promise<WorkspaceModuleConfig[]> {
    const configs = await this.moduleConfigRepository.find({
      where: { workspaceId },
    });

    // If no configs exist, return defaults from registry
    if (configs.length === 0) {
      return Object.values(WORKSPACE_MODULES).map((module) => ({
        id: '',
        workspaceId,
        moduleKey: module.key,
        enabled: module.defaultEnabled,
        config: module.defaultConfig,
        version: module.version,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as WorkspaceModuleConfig[];
    }

    return configs;
  }

  async getModule(
    workspaceId: string,
    moduleKey: string,
  ): Promise<WorkspaceModuleConfig | null> {
    const config = await this.moduleConfigRepository.findOne({
      where: { workspaceId, moduleKey },
    });

    if (config) {
      return config;
    }

    // Module key not found - return default from registry
    const defaults = getModuleDefaults(moduleKey);
    if (!defaults) {
      // Unknown module key - throw NotFoundException
      this.logger.warn(`Unknown module key: ${moduleKey}`);
      throw new NotFoundException(`Module ${moduleKey} not found in registry`);
    }

    // Return default config (not persisted)
    return {
      id: '',
      workspaceId,
      moduleKey,
      enabled: defaults.enabled,
      config: defaults.config,
      version: defaults.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WorkspaceModuleConfig;
  }

  async setModule(
    workspaceId: string,
    moduleKey: string,
    enabled: boolean,
    config?: any,
  ): Promise<WorkspaceModuleConfig> {
    // Verify module key exists in registry
    const defaults = getModuleDefaults(moduleKey);
    if (!defaults) {
      throw new NotFoundException(`Module ${moduleKey} not found in registry`);
    }

    // Upsert module config
    let moduleConfig = await this.moduleConfigRepository.findOne({
      where: { workspaceId, moduleKey },
    });

    if (moduleConfig) {
      moduleConfig.enabled = enabled;
      if (config !== undefined) {
        moduleConfig.config = config;
      }
      moduleConfig.updatedAt = new Date();
      await this.moduleConfigRepository.save(moduleConfig);
    } else {
      moduleConfig = this.moduleConfigRepository.create({
        workspaceId,
        moduleKey,
        enabled,
        config: config !== undefined ? config : defaults.config,
        version: defaults.version,
      });
      await this.moduleConfigRepository.save(moduleConfig);
    }

    return moduleConfig;
  }

  async isModuleEnabled(
    workspaceId: string,
    moduleKey: string,
  ): Promise<boolean> {
    const config = await this.getModule(workspaceId, moduleKey);
    return config?.enabled ?? false;
  }
}
