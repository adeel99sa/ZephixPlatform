import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireOrgRole } from '../workspaces/guards/require-org-role.guard';
import { RequireOrgRoleGuard } from '../workspaces/guards/require-org-role.guard';
import { CustomFieldsService } from './services/custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@ApiTags('Admin - Custom Fields')
@ApiBearerAuth()
@Controller('admin/custom-fields')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole('admin')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all custom fields for organization' })
  @ApiResponse({
    status: 200,
    description: 'Custom fields retrieved successfully',
  })
  async findAll(@CurrentUser() user: UserJwt) {
    return this.customFieldsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get custom field by ID' })
  @ApiResponse({
    status: 200,
    description: 'Custom field retrieved successfully',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    return this.customFieldsService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new custom field' })
  @ApiResponse({
    status: 201,
    description: 'Custom field created successfully',
  })
  async create(
    @Body() dto: CreateCustomFieldDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.customFieldsService.create(dto, user.organizationId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update custom field' })
  @ApiResponse({
    status: 200,
    description: 'Custom field updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.customFieldsService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete custom field' })
  @ApiResponse({
    status: 200,
    description: 'Custom field deleted successfully',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    await this.customFieldsService.remove(id, user.organizationId);
    return { message: 'Custom field deleted successfully' };
  }
}
