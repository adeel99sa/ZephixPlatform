import { SetMetadata } from '@nestjs/common';

export const REQUIRE_WORKSPACE_MODULE_KEY = 'requireWorkspaceModule';

export const RequireWorkspaceModule = (moduleKey: string) =>
  SetMetadata(REQUIRE_WORKSPACE_MODULE_KEY, moduleKey);
