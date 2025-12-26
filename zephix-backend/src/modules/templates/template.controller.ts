import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TemplateService } from './template.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

@Controller('templates')
@UseGuards(AuthGuard('jwt'))
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async getTemplates(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.templateService.getSystemTemplates(organizationId);
  }

  @Post(':id/activate')
  async activateTemplate(
    @Param('id') templateId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.templateService.activateTemplate(templateId, organizationId);
  }
}
