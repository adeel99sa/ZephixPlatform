import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
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

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    return this.plansService.findAll();
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current organization subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
  })
  async getSubscription(@Request() req) {
    return this.subscriptionsService.findForOrganization(
      req.user.organizationId,
    );
  }

  @Get('current-plan')
  @ApiOperation({ summary: 'Get current organization plan' })
  @ApiResponse({
    status: 200,
    description: 'Current plan retrieved successfully',
  })
  async getCurrentPlan(@Request() req) {
    return this.subscriptionsService.getCurrentPlan(req.user.organizationId);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Create or update subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async subscribe(@Request() req, @Body() createDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(req.user.organizationId, createDto);
  }

  @Patch('subscription')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
  })
  async updateSubscription(
    @Request() req,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(req.user.organizationId, updateDto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  async cancelSubscription(@Request() req) {
    return this.subscriptionsService.cancel(req.user.organizationId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage limits and current usage' })
  @ApiResponse({
    status: 200,
    description: 'Usage information retrieved successfully',
  })
  async getUsage(@Request() req) {
    const [users, projects, workspaces, storage] = await Promise.all([
      this.subscriptionsService.checkUsageLimit(
        req.user.organizationId,
        'users',
      ),
      this.subscriptionsService.checkUsageLimit(
        req.user.organizationId,
        'projects',
      ),
      this.subscriptionsService.checkUsageLimit(
        req.user.organizationId,
        'workspaces',
      ),
      this.subscriptionsService.checkUsageLimit(
        req.user.organizationId,
        'storage',
      ),
    ]);

    return {
      users,
      projects,
      workspaces,
      storage,
    };
  }
}
