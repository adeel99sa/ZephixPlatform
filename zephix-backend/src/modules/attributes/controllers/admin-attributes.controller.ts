import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  RequireOrgRole,
  RequireOrgRoleGuard,
} from '../../workspaces/guards/require-org-role.guard';
import { AttributeDefinitionsService } from '../services/attribute-definitions.service';
import { CreateAttributeDefinitionDto } from '../dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from '../dto/update-attribute-definition.dto';

type UserJwt = { id: string; organizationId: string; role: string };

@ApiTags('Admin — Attributes')
@ApiBearerAuth()
@Controller('admin/attributes')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole('admin')
export class AdminAttributesController {
  constructor(private readonly definitionsService: AttributeDefinitionsService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'List ORG-scoped attribute definitions' })
  findAll(@CurrentUser() user: UserJwt) {
    return this.definitionsService.findOrgScoped(user.organizationId);
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create an ORG-scoped attribute definition' })
  create(@Body() dto: CreateAttributeDefinitionDto, @CurrentUser() user: UserJwt) {
    return this.definitionsService.createOrgScoped(dto, user.organizationId, user.id);
  }

  @Patch('definitions/:defId')
  @ApiOperation({ summary: 'Update an attribute definition (org-admin authority)' })
  update(
    @Param('defId') defId: string,
    @Body() dto: UpdateAttributeDefinitionDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.definitionsService.update(defId, dto, {
      userId: user.id,
      orgId: user.organizationId,
      orgRole: user.role,
    });
  }

  @Delete('definitions/:defId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attribute definition (org-admin authority)' })
  async remove(@Param('defId') defId: string, @CurrentUser() user: UserJwt) {
    await this.definitionsService.remove(defId, {
      userId: user.id,
      orgId: user.organizationId,
      orgRole: user.role,
    });
  }
}
