import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceModuleService } from '../services/workspace-module.service';
import { REQUIRE_WORKSPACE_MODULE_KEY } from '../decorators/require-workspace-module.decorator';

@Injectable()
export class RequireWorkspaceModuleGuard implements CanActivate {
  constructor(
    private workspaceModuleService: WorkspaceModuleService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.get<string>(
      REQUIRE_WORKSPACE_MODULE_KEY,
      context.getHandler(),
    );

    if (!moduleKey) {
      return true; // No module requirement
    }

    const request = context.switchToHttp().getRequest();
    // SECURITY: Only read from params, never trust body
    const workspaceId = request.params.workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID required in path');
    }

    const config = await this.workspaceModuleService.getModule(
      workspaceId,
      moduleKey,
    );

    if (!config || !config.enabled) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `Module ${moduleKey} is not enabled for this workspace`,
        error: 'MODULE_DISABLED',
      });
    }

    return true;
  }
}
