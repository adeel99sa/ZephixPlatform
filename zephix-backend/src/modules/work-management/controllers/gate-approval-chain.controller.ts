import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { GateApprovalChainService } from '../services/gate-approval-chain.service';
import {
  CreateApprovalChainDto,
  ReorderStepsDto,
} from '../dto/gate-approval-chain.dto';

@ApiTags('gate-approval-chains')
@Controller('work/gate-definitions')
@UseGuards(JwtAuthGuard)
export class GateApprovalChainController {
  constructor(
    private readonly chainService: GateApprovalChainService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /work/gate-definitions/:gateDefinitionId/approval-chain
   * Get the approval chain for a gate definition (or null if none).
   */
  @Get(':gateDefinitionId/approval-chain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get approval chain for a gate definition' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'gateDefinitionId', type: String })
  @ApiResponse({ status: 200, description: 'Approval chain or null' })
  async getChainForGate(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('gateDefinitionId') gateDefinitionId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const chain = await this.chainService.getChainForGateDefinition(
        auth,
        workspaceId,
        gateDefinitionId,
      );
      return this.responseService.success(chain);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * POST /work/gate-definitions/approval-chains
   * Create or replace approval chain for a gate definition.
   */
  @Post('approval-chains')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or replace approval chain' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({ status: 201, description: 'Approval chain created' })
  async createChain(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Body() dto: CreateApprovalChainDto,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const chain = await this.chainService.createChain(auth, workspaceId, dto);
      return this.responseService.success(chain);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * GET /work/gate-definitions/approval-chains/:chainId
   * Get a specific chain by ID.
   */
  @Get('approval-chains/:chainId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get approval chain by ID' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'chainId', type: String })
  async getChainById(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('chainId') chainId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const chain = await this.chainService.getChainById(auth, workspaceId, chainId);
      return this.responseService.success(chain);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * PUT /work/gate-definitions/approval-chains/:chainId/reorder
   * Reorder steps in a chain.
   */
  @Put('approval-chains/:chainId/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder approval chain steps' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'chainId', type: String })
  async reorderSteps(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('chainId') chainId: string,
    @Body() dto: ReorderStepsDto,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const chain = await this.chainService.reorderSteps(auth, workspaceId, chainId, dto);
      return this.responseService.success(chain);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * DELETE /work/gate-definitions/approval-chains/:chainId
   * Soft-delete a chain.
   */
  @Delete('approval-chains/:chainId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete approval chain' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'chainId', type: String })
  async deleteChain(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('chainId') chainId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      await this.chainService.deleteChain(auth, workspaceId, chainId);
      return this.responseService.success({ deleted: true });
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }
}
