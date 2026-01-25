import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RequireOrgRole } from '../../modules/workspaces/guards/require-org-role.guard';
import { RequireOrgRoleGuard } from '../../modules/workspaces/guards/require-org-role.guard';
import { PlatformRole } from '../../shared/enums/platform-roles.enum';
import { PlansService } from '../services/plans.service';
import { SubscriptionsService } from '../services/subscriptions.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { CancelSubscriptionDto } from '../dto/cancel-subscription.dto';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans(@Request() req: AuthRequest) {
    try {
      const plans = await this.plansService.findAll();
      // Standardized response contract: { data: Plan[] }
      return { data: plans };
    } catch (error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId } = getAuthContext(req);
      this.logger.error('Failed to get plans', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId,
        requestId,
        endpoint: 'GET /api/billing/plans',
      });
      // Return empty array as safe default
      return { data: [] };
    }
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current organization subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
  })
  async getSubscription(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const subscription =
        await this.subscriptionsService.findForOrganization(organizationId);
      // Standardized response contract: { data: Subscription | null }
      return { data: subscription };
    } catch (error) {
      // Never throw 500 - return null as safe default
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId } = getAuthContext(req);
      this.logger.error('Failed to get subscription', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId,
        requestId,
        endpoint: 'GET /api/billing/subscription',
      });
      // Return null as safe default (no subscription)
      return { data: null };
    }
  }

  @Get('current-plan')
  @ApiOperation({ summary: 'Get current organization plan' })
  @ApiResponse({
    status: 200,
    description: 'Current plan retrieved successfully',
  })
  async getCurrentPlan(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const plan =
        await this.subscriptionsService.getCurrentPlan(organizationId);
      // Standardized response contract: { data: CurrentPlan }
      // getCurrentPlan never returns null (returns mocked plan if needed)
      return { data: plan };
    } catch (error) {
      // Never throw 500 - return mocked plan as safe default
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId } = getAuthContext(req);
      this.logger.error('Failed to get current plan', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId,
        requestId,
        endpoint: 'GET /api/billing/current-plan',
      });
      // Return mocked free plan as safe default
      const mockedPlan = this.subscriptionsService.getMockedFreePlan();
      return { data: mockedPlan };
    }
  }

  @Post('subscribe')
  @UseGuards(RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN)
  @ApiOperation({ summary: 'Create or update subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription created or updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Plan changes not allowed for enterprise accounts',
  })
  @ApiResponse({
    status: 409,
    description: 'Billing not enabled or plan changes disabled',
  })
  async subscribe(
    @Request() req: AuthRequest,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    // Support both planId (new) and planType (legacy)
    let planId = createDto.planId;
    if (!planId && createDto.planType) {
      planId = await this.getPlanIdByType(createDto.planType);
    }

    if (!planId) {
      throw new ForbiddenException({
        code: 'PLAN_NOT_FOUND',
        message: 'Plan ID or plan type is required',
      });
    }

    const result = await this.subscriptionsService.subscribe(
      organizationId,
      userId,
      planId,
    );

    return {
      data: {
        subscription: result.subscription,
        plan: result.plan,
        billingMode: result.billingMode,
      },
    };
  }

  private async getPlanIdByType(planType: string): Promise<string | null> {
    const plans = await this.plansService.findAll();
    const plan = plans.find((p) => p.type === planType);
    return plan?.id || null;
  }

  @Patch('subscription')
  @UseGuards(RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN)
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Plan changes not allowed for enterprise accounts',
  })
  @ApiResponse({
    status: 409,
    description: 'Billing not enabled or plan changes disabled',
  })
  async updateSubscription(
    @Request() req: AuthRequest,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    // Convert planType to planId if provided (legacy support)
    if (updateDto.planType && !updateDto.planId) {
      const planId = await this.getPlanIdByType(updateDto.planType);
      if (!planId) {
        throw new ForbiddenException({
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found',
        });
      }
      updateDto.planId = planId;
    }

    const subscription = await this.subscriptionsService.updateSubscription(
      organizationId,
      userId,
      updateDto,
    );

    return { data: subscription };
  }

  @Post('cancel')
  @UseGuards(RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Cancellation not allowed for enterprise accounts',
  })
  @ApiResponse({
    status: 409,
    description: 'Billing not enabled',
  })
  async cancelSubscription(
    @Request() req: AuthRequest,
    @Body() cancelDto: CancelSubscriptionDto,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    const subscription = await this.subscriptionsService.cancelSubscription(
      organizationId,
      userId,
      cancelDto || { cancelNow: false },
    );

    return { data: subscription };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage limits and current usage' })
  @ApiResponse({
    status: 200,
    description: 'Usage information retrieved successfully',
  })
  async getUsage(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const [users, projects, workspaces, storage] = await Promise.all([
        this.subscriptionsService.checkUsageLimit(organizationId, 'users'),
        this.subscriptionsService.checkUsageLimit(organizationId, 'projects'),
        this.subscriptionsService.checkUsageLimit(organizationId, 'workspaces'),
        this.subscriptionsService.checkUsageLimit(organizationId, 'storage'),
      ]);

      // Standardized response contract: { data: Usage }
      return {
        data: {
          users,
          projects,
          workspaces,
          storage,
        },
      };
    } catch (error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId } = getAuthContext(req);
      this.logger.error('Failed to get usage', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId,
        requestId,
        endpoint: 'GET /api/billing/usage',
      });
      // Return safe defaults
      return {
        data: {
          users: { allowed: null, used: 0 },
          projects: { allowed: null, used: 0 },
          workspaces: { allowed: null, used: 0 },
          storage: { allowed: null, used: 0 },
        },
      };
    }
  }
}
