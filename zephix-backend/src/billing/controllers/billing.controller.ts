import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  NotImplementedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PlansService } from '../services/plans.service';
import { SubscriptionsService } from '../services/subscriptions.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { EntitlementService } from '../../modules/billing/entitlements/entitlement.service';
import { PLAN_ENTITLEMENTS } from '../../modules/billing/entitlements/entitlement.registry';
import { PlanCode } from '../../modules/billing/entitlements/plan-code.enum';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly entitlementService: EntitlementService,
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
  @ApiOperation({ summary: 'Create or update subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Plan changes not allowed for enterprise accounts',
  })
  @ApiResponse({
    status: 501,
    description: 'Feature not implemented',
  })
  async subscribe(
    @Request() req: AuthRequest,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    // Check if organization is internally managed before attempting subscription
    const { organizationId } = getAuthContext(req);
    const isInternalManaged =
      await this.subscriptionsService.checkInternalManaged(organizationId);
    if (isInternalManaged) {
      throw new ForbiddenException(
        'Plan changes are not allowed for enterprise accounts. Please contact Zephix support to modify your plan.',
      );
    }
    // For now, return 501 if not implemented
    throw new NotImplementedException(
      'Subscription creation is not yet implemented. Please contact support.',
    );
  }

  @Patch('subscription')
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
    status: 501,
    description: 'Feature not implemented',
  })
  async updateSubscription(
    @Request() req: AuthRequest,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    // Check if organization is internally managed
    const { organizationId } = getAuthContext(req);
    const isInternalManaged =
      await this.subscriptionsService.checkInternalManaged(organizationId);
    if (isInternalManaged && updateDto.planType) {
      throw new ForbiddenException(
        'Plan changes are not allowed for enterprise accounts. Please contact Zephix support to modify your plan.',
      );
    }
    // For now, return 501 if not implemented
    throw new NotImplementedException(
      'Subscription updates are not yet implemented. Please contact support.',
    );
  }

  @Post('cancel')
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
    status: 501,
    description: 'Feature not implemented',
  })
  async cancelSubscription(@Request() req: AuthRequest) {
    // Check if organization is internally managed
    const { organizationId } = getAuthContext(req);
    const isInternalManaged =
      await this.subscriptionsService.checkInternalManaged(organizationId);
    if (isInternalManaged) {
      throw new ForbiddenException(
        'Subscription cancellation is not allowed for enterprise accounts. Please contact Zephix support.',
      );
    }
    // For now, return 501 if not implemented
    throw new NotImplementedException(
      'Subscription cancellation is not yet implemented. Please contact support.',
    );
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

  // ── Phase 3A: Plan visibility endpoint ────────────────────────────

  @Get('org-plan')
  @ApiOperation({ summary: 'Get organization plan, limits, and usage' })
  @ApiResponse({ status: 200, description: 'Plan info retrieved' })
  async getOrgPlan(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const planCode = await this.entitlementService.getPlanCode(organizationId);
      const entitlements = await this.entitlementService.resolve(organizationId);

      return {
        data: {
          planCode,
          limits: {
            max_projects: entitlements.max_projects,
            max_portfolios: entitlements.max_portfolios,
            max_scenarios: entitlements.max_scenarios,
            max_storage_bytes: entitlements.max_storage_bytes,
          },
          features: {
            capacity_engine: entitlements.capacity_engine,
            what_if_scenarios: entitlements.what_if_scenarios,
            portfolio_rollups: entitlements.portfolio_rollups,
            attachments: entitlements.attachments,
            board_view: entitlements.board_view,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to get org plan', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        data: {
          planCode: PlanCode.FREE,
          limits: PLAN_ENTITLEMENTS[PlanCode.FREE],
          features: {},
        },
      };
    }
  }

  // ── Phase 3A: Stripe readiness stubs ──────────────────────────────

  @Post('checkout-session')
  @ApiOperation({ summary: 'Create Stripe checkout session (stub)' })
  @ApiResponse({ status: 501, description: 'Not yet implemented' })
  async createCheckoutSession(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    this.logger.log({ context: 'CHECKOUT_SESSION_STUB', organizationId });
    throw new NotImplementedException({
      code: 'STRIPE_NOT_CONFIGURED',
      message: 'Stripe checkout is not yet configured. Contact sales for plan changes.',
    });
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint (stub)' })
  @ApiResponse({ status: 501, description: 'Not yet implemented' })
  async stripeWebhook(@Request() req: AuthRequest) {
    this.logger.log({ context: 'STRIPE_WEBHOOK_STUB' });
    throw new NotImplementedException({
      code: 'STRIPE_NOT_CONFIGURED',
      message: 'Stripe webhook processing is not yet configured.',
    });
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create Stripe billing portal session (stub)' })
  @ApiResponse({ status: 501, description: 'Not yet implemented' })
  async createPortalSession(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    this.logger.log({ context: 'PORTAL_SESSION_STUB', organizationId });
    throw new NotImplementedException({
      code: 'STRIPE_NOT_CONFIGURED',
      message: 'Billing portal is not yet configured. Contact sales for plan management.',
    });
  }
}
