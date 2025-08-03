import { SetMetadata } from '@nestjs/common';
import { RoleType } from '../entities/role.entity';

export const PERMISSIONS_KEY = 'projectPermissions';
export const RequirePermissions = (...permissions: RoleType[]) => SetMetadata(PERMISSIONS_KEY, permissions); 