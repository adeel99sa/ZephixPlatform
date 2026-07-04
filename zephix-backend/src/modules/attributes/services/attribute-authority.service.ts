import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import {
  AttributeDefinition,
  AttributeScope,
} from '../entities/attribute-definition.entity';
import { TemplateAttributeDefinition } from '../entities/template-attribute-definition.entity';
import { ProjectAttributeDefinition } from '../entities/project-attribute-definition.entity';

export interface AttributePrincipal {
  userId: string;
  orgId: string;
  orgRole: string;
  wsId?: string;
}

@Injectable()
export class AttributeAuthorityService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepo: Repository<WorkspaceMember>,
  ) {}

  /**
   * Throws ForbiddenException if the principal cannot create, update, or delete
   * the given attribute definition. This is the single authority seam; controllers
   * never embed role logic directly.
   *
   * Error code ATTRIBUTE_LOCKED_BY_HIGHER_TIER — used for both:
   *   - role-below-scope attempts (member trying to mutate ORG-scoped def)
   *   - locked-flag enforcement (ws-owner trying to mutate a locked ORG def)
   */
  async assertCanMutate(
    definition: AttributeDefinition,
    principal: AttributePrincipal,
  ): Promise<void> {
    if (definition.scope === AttributeScope.SYSTEM) {
      throw new ForbiddenException({
        code: 'ATTRIBUTE_SYSTEM_IMMUTABLE',
        message: 'SYSTEM-scoped attribute definitions cannot be mutated via API',
      });
    }

    if (definition.scope === AttributeScope.ORG) {
      if (principal.orgRole !== 'admin') {
        throw new ForbiddenException({
          code: 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER',
          message: 'Only org admins can mutate ORG-scoped attribute definitions',
        });
      }
      return;
    }

    if (definition.scope === AttributeScope.WORKSPACE) {
      // Org admin has full authority within their org at all scopes.
      if (principal.orgRole === 'admin') return;

      if (!principal.wsId) {
        throw new ForbiddenException({
          code: 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER',
          message: 'Workspace ID required to mutate WORKSPACE-scoped definitions',
        });
      }

      const member = await this.workspaceMemberRepo.findOne({
        where: {
          userId: principal.userId,
          workspaceId: principal.wsId,
          organizationId: principal.orgId,
        },
      });

      if (member?.role !== 'workspace_owner') {
        throw new ForbiddenException({
          code: 'ATTRIBUTE_LOCKED_BY_HIGHER_TIER',
          message:
            'Only workspace owners can mutate WORKSPACE-scoped attribute definitions',
        });
      }
    }
  }

  /**
   * Throws ForbiddenException if the principal cannot detach a locked attachment.
   * A locked attachment means it was pinned by a higher-tier admin; the tier that
   * set the lock (or any tier above) may detach it.
   */
  async assertCanDetach(
    attachment: TemplateAttributeDefinition | ProjectAttributeDefinition,
    definition: AttributeDefinition,
    principal: AttributePrincipal,
  ): Promise<void> {
    if (attachment.locked) {
      // Locked attachments require the same authority as mutating the definition.
      await this.assertCanMutate(definition, principal);
    }
  }
}
