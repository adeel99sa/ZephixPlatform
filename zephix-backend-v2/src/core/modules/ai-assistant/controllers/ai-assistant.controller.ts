import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { AIAssistantService } from '../services/ai-assistant.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';

@Controller({ path: 'ai', version: '1' })
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AIAssistantController {
  constructor(private readonly aiService: AIAssistantService) {}

  @Post('query')
  async processQuery(
    @Body() body: { query: string; context?: any },
    @CurrentUser() user: any,
    @CurrentOrg() organizationId: string,
  ) {
    return this.aiService.processQuery(body.query, {
      ...body.context,
      userId: user.id,
      organizationId,
    });
  }

  @Get('usage')
  async getUsage(
    @CurrentUser() user: any,
    @CurrentOrg() organizationId: string,
  ) {
    return this.aiService.getTokenUsage(user.id, organizationId);
  }
}
