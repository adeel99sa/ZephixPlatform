import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MethodologyConfig } from '../interfaces/methodology-config.interface';

/**
 * Provides assertion methods that services call to enforce methodology constraints.
 *
 * Service code calls these instead of checking methodology labels:
 *   this.constraints.assertSprintEnabled(config)   — not: if (methodology === 'kanban')
 *   this.constraints.assertChangeControlEnabled(config) — not: if (waterfallEnabled)
 */
@Injectable()
export class MethodologyConstraintsService {
  assertSprintEnabled(config: MethodologyConfig | null): void {
    if (!config) return; // permissive for projects without config
    if (!config.sprint.enabled) {
      throw new ForbiddenException({
        errorCode: 'SPRINTS_DISABLED',
        message:
          'Sprints are not enabled for this project. The project methodology does not support iterations. Update the methodology configuration to enable sprints.',
      });
    }
  }

  assertPhaseGateApproved(
    config: MethodologyConfig | null,
    hasApprovedGate: boolean,
  ): void {
    if (!config) return;
    if (config.phases.gateRequired && !hasApprovedGate) {
      throw new ForbiddenException({
        errorCode: 'PHASE_GATE_REQUIRED',
        message:
          'This project requires phase gate approval before advancing. Submit and approve the phase gate review first.',
      });
    }
  }

  assertCostTrackingEnabled(config: MethodologyConfig | null): void {
    if (!config) return;
    if (!config.governance.costTrackingEnabled) {
      throw new ForbiddenException({
        errorCode: 'COST_TRACKING_DISABLED',
        message:
          'Cost tracking is not enabled for this project methodology. Update the methodology configuration to enable budget tracking.',
      });
    }
  }

  assertBaselinesEnabled(config: MethodologyConfig | null): void {
    if (!config) return;
    if (!config.governance.baselinesEnabled) {
      throw new ForbiddenException({
        errorCode: 'BASELINES_DISABLED',
        message:
          'Baselines are not enabled for this project methodology.',
      });
    }
  }

  assertChangeControlEnabled(config: MethodologyConfig | null): void {
    if (!config) return;
    if (!config.governance.changeManagementEnabled) {
      throw new ForbiddenException({
        errorCode: 'CHANGE_CONTROL_DISABLED',
        message:
          'Change management is not enabled for this project methodology.',
      });
    }
  }

  assertEarnedValueEnabled(config: MethodologyConfig | null): void {
    if (!config) return;
    if (!config.governance.earnedValueEnabled) {
      throw new ForbiddenException({
        errorCode: 'EARNED_VALUE_DISABLED',
        message:
          'Earned value tracking is not enabled for this project methodology.',
      });
    }
  }

  assertCapacityEnabled(config: MethodologyConfig | null): void {
    if (!config) return;
    if (!config.governance.capacityEnabled) {
      throw new ForbiddenException({
        errorCode: 'CAPACITY_DISABLED',
        message:
          'Capacity management is not enabled for this project methodology.',
      });
    }
  }
}
