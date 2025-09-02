import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../modules/organizations/guards/organization.guard';
import { RolesGuard } from '../modules/organizations/guards/roles.guard';
import { Roles } from '../modules/organizations/decorators/roles.decorator';
import { CurrentOrg } from '../modules/organizations/decorators/current-org.decorator';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { IntakeFormService } from '../services/intake-form.service';
import {
  CreateIntakeFormDto,
  UpdateIntakeFormDto,
  IntakeSubmissionDto,
  ProcessIntakeDto,
  SubmissionListQueryDto,
  BulkSubmissionActionDto,
} from '../dto/intake-form.dto';
import { Request } from 'express';

@ApiTags('Intake Forms')
@ApiBearerAuth()
@Controller('pm/intake')
export class IntakeFormController {
  constructor(private readonly intakeService: IntakeFormService) {}

  // Authenticated routes for form management
  @Get('forms')
  @ApiOperation({ summary: 'List intake forms' })
  @ApiResponse({ status: 200, description: 'Forms retrieved successfully' })
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  async getForms(@CurrentOrg() orgId: string) {
    return this.intakeService.getForms(orgId);
  }

  @Post('forms')
  @ApiOperation({ summary: 'Create intake form' })
  @ApiResponse({ status: 201, description: 'Form created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid form configuration' })
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles('admin', 'owner')
  async createForm(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateIntakeFormDto,
  ) {
    return this.intakeService.createForm(orgId, createDto, user.id);
  }

  @Get('forms/:id')
  @ApiOperation({ summary: 'Get intake form by ID' })
  @ApiResponse({ status: 200, description: 'Form retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  async getForm(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.intakeService.getFormById(orgId, id);
  }

  @Patch('forms/:id')
  @ApiOperation({ summary: 'Update intake form' })
  @ApiResponse({ status: 200, description: 'Form updated successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles('admin', 'owner')
  async updateForm(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateIntakeFormDto,
  ) {
    return this.intakeService.updateForm(orgId, id, updateDto);
  }

  @Delete('forms/:id')
  @ApiOperation({ summary: 'Delete intake form' })
  @ApiResponse({ status: 204, description: 'Form deleted successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete form with pending submissions',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
  @Roles('admin', 'owner')
  async deleteForm(@CurrentOrg() orgId: string, @Param('id') id: string) {
    await this.intakeService.deleteForm(orgId, id);
  }

  // Submission management routes
  @Get('submissions')
  @ApiOperation({ summary: 'List intake submissions' })
  @ApiResponse({
    status: 200,
    description: 'Submissions retrieved successfully',
  })
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  async getSubmissions(
    @CurrentOrg() orgId: string,
    @Query() query: SubmissionListQueryDto,
  ) {
    return this.intakeService.getSubmissions(orgId, query);
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get intake submission by ID' })
  @ApiResponse({
    status: 200,
    description: 'Submission retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  async getSubmission(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.intakeService.getSubmissionById(orgId, id);
  }

  @Post('submissions/:id/process')
  @ApiOperation({ summary: 'Process intake submission into project' })
  @ApiResponse({
    status: 200,
    description: 'Submission processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot process submission in current state',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  async processIntake(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() processDto: ProcessIntakeDto,
  ) {
    return this.intakeService.processIntoProject(
      orgId,
      id,
      processDto,
      user.id,
    );
  }

  @Post('submissions/bulk-action')
  @ApiOperation({ summary: 'Execute bulk action on submissions' })
  @ApiResponse({ status: 200, description: 'Bulk action completed' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  async bulkAction(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Body() bulkActionDto: BulkSubmissionActionDto,
  ) {
    return this.intakeService.bulkAction(orgId, bulkActionDto, user.id);
  }

  @Get('forms/:id/analytics')
  @ApiOperation({ summary: 'Get form analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  async getFormAnalytics(
    @CurrentOrg() orgId: string,
    @Param('id') formId: string,
  ) {
    const form = await this.intakeService.getFormById(orgId, formId);
    const submissions = await this.intakeService.getSubmissions(orgId, {
      formId,
    });

    const analytics = {
      formId: form.id,
      formName: form.name,
      totalViews: form.analytics?.totalViews || 0,
      totalSubmissions: form.analytics?.totalSubmissions || 0,
      conversionRate: form.analytics?.conversionRate || 0,
      submissionsByStatus: this.calculateSubmissionsByStatus(submissions.data),
      submissionsByPriority: this.calculateSubmissionsByPriority(
        submissions.data,
      ),
      averageCompletionTime: this.calculateAverageCompletionTime(
        submissions.data,
      ),
      peakSubmissionHours: this.calculatePeakSubmissionHours(submissions.data),
    };

    return analytics;
  }

  private calculateSubmissionsByStatus(
    submissions: any[],
  ): Record<string, number> {
    return submissions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateSubmissionsByPriority(
    submissions: any[],
  ): Record<string, number> {
    return submissions.reduce((acc, sub) => {
      acc[sub.priority || 'medium'] = (acc[sub.priority || 'medium'] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverageCompletionTime(submissions: any[]): number {
    const completed = submissions.filter((s) => s.completedAt);
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((acc, sub) => {
      const diff =
        new Date(sub.completedAt).getTime() - new Date(sub.createdAt).getTime();
      return acc + diff;
    }, 0);

    return Math.round(totalTime / completed.length / (1000 * 60 * 60)); // hours
  }

  private calculatePeakSubmissionHours(
    submissions: any[],
  ): Record<string, number> {
    return submissions.reduce((acc, sub) => {
      const hour = new Date(sub.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
  }
}

@ApiTags('Public Intake')
@Controller('intake')
export class PublicIntakeController {
  constructor(private readonly intakeService: IntakeFormService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public intake form' })
  @ApiResponse({ status: 200, description: 'Form retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Form not found or not accessible' })
  async getPublicForm(@Param('slug') slug: string) {
    const form = await this.intakeService.getPublicForm(slug);

    // Remove sensitive information before returning
    const { analytics, settings, ...publicForm } = form;
    return {
      ...publicForm,
      settings: {
        requireLogin: settings.requireLogin,
        allowAnonymous: settings.allowAnonymous,
        confirmationMessage: settings.confirmationMessage,
        redirectUrl: settings.redirectUrl,
      },
    };
  }

  @Post(':slug/submit')
  @ApiOperation({ summary: 'Submit intake form' })
  @ApiResponse({ status: 201, description: 'Submission created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async submitIntake(
    @Param('slug') slug: string,
    @Body() submissionDto: IntakeSubmissionDto,
    @Req() request: Request,
  ) {
    // Extract metadata from request
    const metadata = {
      ...submissionDto.metadata,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'] || '',
      referrer: request.headers.referer || '',
    };

    const enrichedSubmission = {
      ...submissionDto,
      metadata,
    };

    // Check if user is authenticated (optional)
    const userId = (request as any).user?.id;

    const submission = await this.intakeService.submitIntake(
      slug,
      enrichedSubmission,
      userId,
    );

    // Return minimal response to prevent data leakage
    return {
      id: submission.id,
      title: submission.title,
      status: submission.status,
      submittedAt: submission.createdAt,
      confirmationMessage:
        'Thank you for your submission. We will review it and get back to you soon.',
    };
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      ''
    ).replace('::ffff:', '');
  }
}
