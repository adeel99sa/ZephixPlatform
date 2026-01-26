import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { formatResponse } from '../../shared/helpers/response.helper';
import { UserJwt } from '../auth/types/user-jwt.interface';

@Controller()
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post('workspaces/:workspaceId/forms')
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() createFormDto: CreateFormDto,
    @CurrentUser() user: UserJwt,
    @Req() req: Request,
  ) {
    const form = await this.formsService.create(
      workspaceId,
      createFormDto,
      user.id,
      user.organizationId,
      user.role || user.platformRole || 'viewer',
    );

    return formatResponse({ formId: form.id });
  }

  @Get('forms/:formId')
  async findOne(@Param('formId') formId: string, @CurrentUser() user: UserJwt) {
    const form = await this.formsService.findOne(
      formId,
      user.id,
      user.organizationId,
      user.role || user.platformRole || 'viewer',
    );

    return formatResponse({
      id: form.id,
      workspaceId: form.workspaceId,
      title: form.title,
      schema: form.schema || null,
      createdAt: form.createdAt.toISOString(),
    });
  }

  @Patch('forms/:formId')
  async update(
    @Param('formId') formId: string,
    @Body() updateFormDto: UpdateFormDto,
    @CurrentUser() user: UserJwt,
  ) {
    const form = await this.formsService.update(
      formId,
      updateFormDto,
      user.id,
      user.organizationId,
      user.role || user.platformRole || 'viewer',
    );

    return formatResponse({
      id: form.id,
      workspaceId: form.workspaceId,
      title: form.title,
      schema: form.schema || null,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    });
  }
}
