import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ResponseService } from '../../../shared/services/response.service';
import { OperationalDashboardService } from '../services/operational-dashboard.service';
import { DashboardCardMutationDto } from '../dto/dashboard-card-mutation.dto';

@ApiTags('operational-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OperationalDashboardController {
  constructor(
    private readonly operationalDashboardService: OperationalDashboardService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('dashboard/home')
  @ApiOperation({ summary: 'Get personal home dashboard cards' })
  @ApiResponse({ status: 200, description: 'Home dashboard loaded' })
  async getHomeDashboard(@Req() req: AuthRequest) {
    const context = this.getContext(req);
    const data = await this.operationalDashboardService.getHomeDashboard(context);
    return this.responseService.success(data);
  }

  @Get('workspaces/:workspaceId/dashboard')
  @ApiOperation({ summary: 'Get workspace operational dashboard cards' })
  @ApiParam({ name: 'workspaceId', type: String })
  @ApiResponse({ status: 200, description: 'Workspace dashboard loaded' })
  async getWorkspaceDashboard(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
  ) {
    const context = this.getContext(req);
    const data = await this.operationalDashboardService.getWorkspaceDashboard(
      context,
      workspaceId,
    );
    return this.responseService.success(data);
  }

  @Get('dashboard/cards/catalog')
  @ApiOperation({ summary: 'Get dashboard card catalog' })
  @ApiResponse({ status: 200, description: 'Card catalog loaded' })
  async getCardCatalog() {
    const home = await this.operationalDashboardService.getCardCatalog('home');
    const workspace =
      await this.operationalDashboardService.getCardCatalog('workspace');
    return this.responseService.success({ home, workspace });
  }

  @Post('dashboard/home/cards')
  @ApiOperation({ summary: 'Add card to home dashboard' })
  async addHomeCard(
    @Body() body: DashboardCardMutationDto,
    @Req() req: AuthRequest,
  ) {
    const context = this.getContext(req);
    const data = await this.operationalDashboardService.addCardToDashboard(
      context,
      'home',
      context.userId,
      body.cardKey as any,
    );
    return this.responseService.success(data);
  }

  @Delete('dashboard/home/cards/:cardKey')
  @ApiOperation({ summary: 'Remove card from home dashboard' })
  @ApiParam({ name: 'cardKey', type: String })
  async removeHomeCard(
    @Param('cardKey') cardKey: string,
    @Req() req: AuthRequest,
  ) {
    const context = this.getContext(req);
    const data = await this.operationalDashboardService.removeCardFromDashboard(
      context,
      'home',
      context.userId,
      cardKey as any,
    );
    return this.responseService.success(data);
  }

  @Post('workspaces/:workspaceId/dashboard/cards')
  @ApiOperation({ summary: 'Add card to workspace dashboard' })
  @ApiParam({ name: 'workspaceId', type: String })
  async addWorkspaceCard(
    @Param('workspaceId') workspaceId: string,
    @Body() body: DashboardCardMutationDto,
    @Req() req: AuthRequest,
  ) {
    const context = this.getContext(req);
    const data = await this.operationalDashboardService.addCardToDashboard(
      context,
      'workspace',
      workspaceId,
      body.cardKey as any,
    );
    return this.responseService.success(data);
  }

  @Delete('workspaces/:workspaceId/dashboard/cards/:cardKey')
  @ApiOperation({ summary: 'Remove card from workspace dashboard' })
  @ApiParam({ name: 'workspaceId', type: String })
  @ApiParam({ name: 'cardKey', type: String })
  async removeWorkspaceCard(
    @Param('workspaceId') workspaceId: string,
    @Param('cardKey') cardKey: string,
    @Req() req: AuthRequest,
  ) {
    const context = this.getContext(req);
    const data = await this.operationalDashboardService.removeCardFromDashboard(
      context,
      'workspace',
      workspaceId,
      cardKey as any,
    );
    return this.responseService.success(data);
  }

  private getContext(req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }
    return { organizationId, userId, platformRole };
  }
}

