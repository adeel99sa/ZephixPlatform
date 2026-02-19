import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ALL_PROJECT_TABS,
  EstimationType,
  LifecycleType,
  MethodologyCode,
  MethodologyConfig,
  WipEnforcement,
} from '../interfaces/methodology-config.interface';

interface ValidationError {
  field: string;
  message: string;
  constraint: string;
}

/**
 * Validates MethodologyConfig for structural correctness and data-integrity consistency.
 * No methodology-brand locks — org admins can override any default.
 * Only data-integrity rules are enforced (e.g. earned value requires cost tracking).
 */
@Injectable()
export class MethodologyConfigValidatorService {
  validate(config: MethodologyConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    errors.push(...this.validateStructure(config));
    if (errors.length > 0) return errors;

    errors.push(...this.validateDataIntegrity(config));
    return errors;
  }

  validateOrThrow(config: MethodologyConfig): void {
    const errors = this.validate(config);
    if (errors.length > 0) {
      throw new BadRequestException({
        errorCode: 'METHODOLOGY_CONFIG_INVALID',
        message: 'Methodology configuration validation failed',
        errors,
      });
    }
  }

  private validateStructure(config: MethodologyConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Object.values(LifecycleType).includes(config.lifecycleType)) {
      errors.push({
        field: 'lifecycleType',
        message: `Must be one of: ${Object.values(LifecycleType).join(', ')}`,
        constraint: 'valid_enum',
      });
    }

    if (!Object.values(MethodologyCode).includes(config.methodologyCode)) {
      errors.push({
        field: 'methodologyCode',
        message: `Must be one of: ${Object.values(MethodologyCode).join(', ')}`,
        constraint: 'valid_enum',
      });
    }

    if (!config.sprint || typeof config.sprint.enabled !== 'boolean') {
      errors.push({
        field: 'sprint.enabled',
        message: 'sprint.enabled is required and must be boolean',
        constraint: 'required',
      });
    }

    if (
      config.sprint?.enabled &&
      (typeof config.sprint.defaultLengthDays !== 'number' ||
        config.sprint.defaultLengthDays < 1 ||
        config.sprint.defaultLengthDays > 90)
    ) {
      errors.push({
        field: 'sprint.defaultLengthDays',
        message: 'Must be between 1 and 90 when sprints are enabled',
        constraint: 'range',
      });
    }

    if (!config.phases || typeof config.phases.gateRequired !== 'boolean') {
      errors.push({
        field: 'phases.gateRequired',
        message: 'phases.gateRequired is required and must be boolean',
        constraint: 'required',
      });
    }

    if (!config.wip || typeof config.wip.enabled !== 'boolean') {
      errors.push({
        field: 'wip.enabled',
        message: 'wip.enabled is required and must be boolean',
        constraint: 'required',
      });
    }

    if (
      config.wip?.enabled &&
      !Object.values(WipEnforcement).includes(config.wip.enforcement)
    ) {
      errors.push({
        field: 'wip.enforcement',
        message: `Must be one of: ${Object.values(WipEnforcement).join(', ')} when WIP is enabled`,
        constraint: 'valid_enum',
      });
    }

    if (
      config.wip?.defaultLimit !== null &&
      config.wip?.defaultLimit !== undefined &&
      (typeof config.wip.defaultLimit !== 'number' ||
        config.wip.defaultLimit < 1 ||
        config.wip.defaultLimit > 100)
    ) {
      errors.push({
        field: 'wip.defaultLimit',
        message: 'Must be between 1 and 100 or null',
        constraint: 'range',
      });
    }

    if (
      !config.estimation ||
      !Object.values(EstimationType).includes(config.estimation.type)
    ) {
      errors.push({
        field: 'estimation.type',
        message: `Must be one of: ${Object.values(EstimationType).join(', ')}`,
        constraint: 'valid_enum',
      });
    }

    if (!config.kpiPack?.packCode) {
      errors.push({
        field: 'kpiPack.packCode',
        message: 'kpiPack.packCode is required',
        constraint: 'required',
      });
    }

    if (!Array.isArray(config.ui?.tabs) || config.ui.tabs.length === 0) {
      errors.push({
        field: 'ui.tabs',
        message: 'At least one tab is required',
        constraint: 'min_length',
      });
    }

    if (config.ui?.tabs) {
      const invalid = config.ui.tabs.filter(
        (t) => !(ALL_PROJECT_TABS as readonly string[]).includes(t),
      );
      if (invalid.length > 0) {
        errors.push({
          field: 'ui.tabs',
          message: `Invalid tabs: ${invalid.join(', ')}. Valid: ${ALL_PROJECT_TABS.join(', ')}`,
          constraint: 'valid_values',
        });
      }
    }

    return errors;
  }

  private validateDataIntegrity(
    config: MethodologyConfig,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.sprint.enabled && !config.governance.iterationsEnabled) {
      errors.push({
        field: 'governance.iterationsEnabled',
        message:
          'iterationsEnabled must be true when sprints are enabled',
        constraint: 'consistency',
      });
    }

    if (config.phases.gateRequired && !config.governance.waterfallEnabled) {
      errors.push({
        field: 'governance.waterfallEnabled',
        message:
          'waterfallEnabled must be true when phase gates are required',
        constraint: 'consistency',
      });
    }

    if (
      config.governance.earnedValueEnabled &&
      !config.governance.costTrackingEnabled
    ) {
      errors.push({
        field: 'governance.costTrackingEnabled',
        message:
          'costTrackingEnabled must be true when earned value is enabled',
        constraint: 'consistency',
      });
    }

    if (
      !config.ui.tabs.includes('overview')
    ) {
      errors.push({
        field: 'ui.tabs',
        message: 'overview tab is always required',
        constraint: 'required_tab',
      });
    }

    return errors;
  }
}
