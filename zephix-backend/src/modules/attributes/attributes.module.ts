import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributeDefinition } from './entities/attribute-definition.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { TemplateAttributeDefinition } from './entities/template-attribute-definition.entity';
import { WorkspaceEnabledAttribute } from './entities/workspace-enabled-attribute.entity';
import { ProjectAttributeDefinition } from './entities/project-attribute-definition.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { Template } from '../templates/entities/template.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { AttributeAuthorityService } from './services/attribute-authority.service';
import { AttributeDefinitionsService } from './services/attribute-definitions.service';
import { AttributeValuesService } from './services/attribute-values.service';
import { WorkspaceAttributesController } from './controllers/workspace-attributes.controller';
import { AdminAttributesController } from './controllers/admin-attributes.controller';
import { AttributeValuesController } from './controllers/attribute-values.controller';
import {
  RequireOrgRoleGuard,
} from '../workspaces/guards/require-org-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttributeDefinition,
      AttributeValue,
      TemplateAttributeDefinition,
      WorkspaceEnabledAttribute,
      ProjectAttributeDefinition,
      WorkspaceMember, // Required by AttributeAuthorityService for workspace-role lookup
      Template, // SEC-XORG-READ-2 (R6): assertTemplateInOrg on findTemplateAttachments
      Workspace, // SEC-XORG-READ-2 (R6): validate the :wsId path param against org
    ]),
  ],
  providers: [
    AttributeAuthorityService,
    AttributeDefinitionsService,
    AttributeValuesService,
    RequireOrgRoleGuard,
  ],
  controllers: [
    WorkspaceAttributesController,
    AdminAttributesController,
    AttributeValuesController,
  ],
  exports: [
    TypeOrmModule,
    AttributeDefinitionsService,
    AttributeValuesService,
  ],
})
export class AttributesModule {}
