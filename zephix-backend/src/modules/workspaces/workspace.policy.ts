import { Injectable, ForbiddenException } from '@nestjs/common';

export type OrgRole = 'admin' | 'member' | 'guest';

@Injectable()
export class WorkspacePolicy {
  enforceCreate(orgRole: OrgRole) {
    if (orgRole !== 'admin')
      throw new ForbiddenException('Only org admins can create workspaces');
  }
  enforceUpdate(orgRole: OrgRole) {
    if (orgRole !== 'admin')
      throw new ForbiddenException('Only org admins can update workspaces');
  }
  enforceDelete(orgRole: OrgRole) {
    if (orgRole !== 'admin')
      throw new ForbiddenException('Only org admins can delete workspaces');
  }
}
