import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * WorkspaceMembershipFeatureGuard
 *
 * Enforces the ZEPHIX_WS_MEMBERSHIP_V1 feature flag.
 *
 * Bypass policy:
 * - NODE_ENV=development → bypass (local dev loops)
 * - NODE_ENV=test → bypass (test suites set their own flag state)
 * - Anything else (including production and staging) → evaluate the flag
 *
 * This is intentionally NOT `NODE_ENV !== 'production'` because staging runs with
 * NODE_ENV=production and must exercise the same guard behavior as production.
 */
@Injectable()
export class WorkspaceMembershipFeatureGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceMembershipFeatureGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'production');
    const zephixEnv = this.configService.get<string>('ZEPHIX_ENV', 'production');
    const flagValue = this.configService.get<string>(
      'ZEPHIX_WS_MEMBERSHIP_V1',
    );

    const isLocalOrTest = nodeEnv === 'development' || nodeEnv === 'test';

    if (isLocalOrTest) {
      this.logger.debug(
        `[feature-flag-guard] Bypassed (nodeEnv=${nodeEnv || '(unset)'}, ` +
          `zephixEnv=${zephixEnv || '(unset)'})`,
      );
      return true;
    }

    const isEnabled = flagValue === '1';

    if (!isEnabled) {
      this.logger.warn(
        `[feature-flag-guard] BLOCKED: ZEPHIX_WS_MEMBERSHIP_V1="${flagValue ?? '<unset>'}" ` +
          `in nodeEnv=${nodeEnv || '(unset)'}, zephixEnv=${zephixEnv || '(unset)'}`,
      );
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        feature: 'workspace_membership_v1',
        message:
          'Workspace membership feature is not enabled for this environment',
      });
    }

    return true;
  }
}
