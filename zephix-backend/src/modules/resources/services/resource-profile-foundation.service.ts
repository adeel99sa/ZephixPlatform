import { Injectable } from '@nestjs/common';

@Injectable()
export class ResourceProfileFoundationService {
  async enrollUserResourceProfile(_userId: string, _orgId: string): Promise<void> {}
  async ensureForOrganizationMember(_opts: {
    userId: string;
    organizationId: string;
    orgRole?: string;
  }): Promise<void> {}
}