import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { StatusReportingService } from '../services/status-reporting.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../../modules/projects/guards/project-permission.guard';
import { RequirePermissions } from '../../modules/projects/decorators/project-permissions.decorator';
import { RoleType } from '../../modules/projects/entities/role.entity';

interface GenerateReportDto {
  projectId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  stakeholderAudience: 'executive' | 'sponsor' | 'team' | 'client' | 'all';
  reportFormat: 'executive-summary' | 'detailed' | 'dashboard' | 'presentation';
  includeMetrics?: boolean;
  includeTrends?: boolean;
  includeRisks?: boolean;
  includeStakeholderViews?: boolean;
}

interface ExportReportDto {
  reportId: string;
  format: 'pdf' | 'pptx' | 'excel' | 'html';
  stakeholderAudience: 'executive' | 'sponsor' | 'team' | 'client';
}

interface ConfigureAlertsDto {
  projectId: string;
  alertType: 'schedule' | 'budget' | 'risk' | 'quality' | 'scope';
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
  recipients: string[];
  customMessage?: string;
}

@Controller('pm/status-reporting')
@UseGuards(JwtAuthGuard)
export class StatusReportingController {
  constructor(
    private readonly statusReportingService: StatusReportingService,
  ) {}

  @Get('projects/:projectId/metrics')
  @UseGuards(ProjectPermissionGuard)
  @RequirePermissions(RoleType.VIEWER)
  async getProjectMetrics(
    @Param('projectId') projectId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('metricType') metricType?: string,
  ) {
    try {
      const metrics =
        await this.statusReportingService.getProjectMetrics(projectId);
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch project metrics',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('projects/:projectId/trends')
  @UseGuards(ProjectPermissionGuard)
  @RequirePermissions(RoleType.VIEWER)
  async getProjectTrends(
    @Param('projectId') projectId: string,
    @Query('period') period: string = '30d',
    @Query('metricType') metricType?: string,
  ) {
    try {
      const trends = await this.statusReportingService.getPerformanceTrends(
        projectId,
        period,
      );
      return {
        success: true,
        data: trends,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch project trends',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Get('projects/:projectId/risks')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions('read')
  // async getProjectRisks(
  //   @Param('projectId') projectId: string,
  //   @Query('severity') severity?: string,
  //   @Query('status') status?: string,
  // ) {
  //   try {
  //     const risks = await this.statusReportingService.getProjectRisks(
  //       projectId,
  //       severity,
  //       status,
  //     );
  //     return {
  //       success: true,
  //       data: risks,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to fetch project risks',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Get('projects/:projectId/stakeholder-views')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions('read')
  // async getStakeholderViews(
  //   @Param('projectId') projectId: string,
  //   @Query('stakeholderType') stakeholderType?: string,
  // ) {
  //   try {
  //     const views = await this.statusReportingService.getStakeholderViews(
  //       projectId,
  //       stakeholderType,
  //     );
  //     return {
  //       success: true,
  //       data: views,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to fetch stakeholder views',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  @Post('generate-report')
  @UseGuards(ProjectPermissionGuard)
  @RequirePermissions(RoleType.EDITOR)
  async generateReport(
    @Body() generateReportDto: GenerateReportDto,
    @Request() req: any,
  ) {
    try {
      const report = await this.statusReportingService.generateStatusReport(
        {
          projectId: generateReportDto.projectId,
          reportingPeriod: {
            startDate: generateReportDto.reportingPeriodStart,
            endDate: generateReportDto.reportingPeriodEnd,
          },
          stakeholderAudience: generateReportDto.stakeholderAudience,
          reportFormat: generateReportDto.reportFormat,
          dataSourcesConfig: {
            includeJira: true,
            includeGitHub: true,
            includeTeamsData: true,
            includeBudgetData: true,
            includeManualUpdates: true,
          },
        },
        req.user.id,
      );
      return {
        success: true,
        data: report,
        message: 'Status report generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate status report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('export-report')
  @UseGuards(ProjectPermissionGuard)
  @RequirePermissions(RoleType.VIEWER)
  async exportReport(@Body() exportReportDto: ExportReportDto) {
    try {
      const result = await this.statusReportingService.exportReport(
        exportReportDto.reportId,
        exportReportDto.format,
        exportReportDto.stakeholderAudience,
      );
      return {
        success: true,
        data: result,
        message: 'Report exported successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to export report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Get('projects/:projectId/reports')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions('read')
  // async getProjectReports(
  //   @Param('projectId') projectId: string,
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  //   @Query('status') status?: string,
  //   @Query('format') format?: string,
  // ) {
  //   try {
  //     const reports = await this.statusReportingService.getProjectReports(
  //       projectId,
  //       startDate,
  //       endDate,
  //       status,
  //       format,
  //     );
  //     return {
  //       success: true,
  //       data: reports,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to fetch project reports',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Get('reports/:reportId')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions('read')
  // async getReport(@Param('reportId') reportId: string) {
  //   try {
  //     const report = await this.statusReportingService.getReport(reportId);
  //     return {
  //       success: true,
  //       data: report,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to fetch report',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Post('alerts/configure')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions('write')
  // async configureAlerts(@Body() configureAlertsDto: ConfigureAlertsDto, @Request() req: any) {
  //   try {
  //     const alert = await this.statusReportingService.configureAlerts({
  //       ...configureAlertsDto,
  //       createdBy: req.user.id,
  //     });
  //     return {
  //       success: true,
  //       data: alert,
  //       message: 'Alert configuration created successfully',
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to configure alerts',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Get('projects/:projectId/alerts')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions(RoleType.VIEWER)
  // async getProjectAlerts(
  //   @Param('projectId') projectId: string,
  //   @Query('alertType') alertType?: string,
  //   @Query('isActive') isActive?: boolean,
  // ) {
  //   try {
  //     const alerts = await this.statusReportingService.getProjectAlerts(
  //       projectId,
  //       alertType,
  //       isActive,
  //     );
  //     return {
  //       success: true,
  //       data: alerts,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to fetch project alerts',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Put('alerts/:alertId')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions(RoleType.EDITOR)
  // async updateAlert(
  //   @Param('alertId') alertId: string,
  //   @Body() updateData: Partial<ConfigureAlertsDto>,
  // ) {
  //   try {
  //     const alert = await this.statusReportingService.updateAlert(alertId, updateData);
  //     return {
  //       success: true,
  //       data: alert,
  //       message: 'Alert configuration updated successfully',
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to update alert configuration',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Delete('alerts/:alertId')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions(RoleType.EDITOR)
  // async deleteAlert(@Param('alertId') alertId: string) {
  //   try {
  //     await this.statusReportingService.deleteAlert(alertId);
  //     return {
  //       success: true,
  //       message: 'Alert configuration deleted successfully',
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to delete alert configuration',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Post('projects/:projectId/manual-updates')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions(RoleType.EDITOR)
  // async createManualUpdate(
  //   @Param('projectId') projectId: string,
  //   @Body() updateData: {
  //     category: 'schedule' | 'budget' | 'scope' | 'quality' | 'risk' | 'stakeholder';
  //     description: string;
  //     impact: 'positive' | 'negative' | 'neutral';
  //     quantitativeData?: any;
  //     attachments?: string[];
  //   },
  //   @Request() req: any,
  // ) {
  //   try {
  //     const update = await this.statusReportingService.createManualUpdate({
  //       projectId,
  //       ...updateData,
  //       submittedBy: req.user.id,
  //     });
  //     return {
  //       success: true,
  //       data: update,
  //       message: 'Manual update created successfully',
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to create manual update',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Get('projects/:projectId/manual-updates')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions(RoleType.VIEWER)
  // async getManualUpdates(
  //   @Param('projectId') projectId: string,
  //   @Query('category') category?: string,
  //   @Query('impact') impact?: string,
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  // ) {
  //   try {
  //     const updates = await this.statusReportingService.getManualUpdates(
  //       projectId,
  //       projectId,
  //       category,
  //       impact,
  //       startDate,
  //       endDate,
  //     );
  //     return {
  //       success: true,
  //       data: updates,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to fetch manual updates',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Get('projects/:projectId/overview')
  // @UseGuards(ProjectPermissionGuard)
  // @RequirePermissions(RoleType.VIEWER)
  // async getProjectOverview(@Param('projectId') projectId: string) {
  //   try {
  //     const overview = await this.statusReportingService.getProjectOverview(projectId);
  //     return {
  //       success: true,
  //       data: overview,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       {
  //         success: false,
  //         message: error.message || 'Failed to fetch project overview',
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
}
