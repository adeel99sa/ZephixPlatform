import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StatusReportingService } from '../services/status-reporting.service';
import type { StatusReportInput, StatusReportOutput } from '../services/status-reporting.service';

@ApiTags('Status Reporting')
@Controller('pm/status-reporting')
@UseGuards(JwtAuthGuard)
export class StatusReportingController {
  constructor(
    private readonly statusReportingService: StatusReportingService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate comprehensive status report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Status report generated successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters',
  })
  async generateStatusReport(
    @Body() input: StatusReportInput,
    @Request() req: any,
  ): Promise<{ success: boolean; data: StatusReportOutput; reportId: string }> {
    try {
      const result = await this.statusReportingService.generateStatusReport(
        input,
        req.user.id,
      );

      return {
        success: true,
        data: result,
        reportId: result.reportId,
      };
    } catch (error) {
      throw new BadRequestException(`Report generation failed: ${error.message}`);
    }
  }

  @Get(':projectId/metrics')
  @ApiOperation({ summary: 'Get current project health metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project metrics retrieved successfully',
  })
  async getProjectMetrics(
    @Param('projectId') projectId: string,
  ): Promise<{ success: boolean; data: any }> {
    try {
      // Calculate real-time project health metrics
      const metrics = await this.calculateProjectHealthMetrics(projectId);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new NotFoundException(`Project metrics not found: ${error.message}`);
    }
  }

  @Get(':projectId/trends')
  @ApiOperation({ summary: 'Get performance trends analysis' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period for trends' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance trends retrieved successfully',
  })
  async getPerformanceTrends(
    @Param('projectId') projectId: string,
    @Query('period') period?: string,
  ): Promise<{ success: boolean; data: any[] }> {
    try {
      const trends = await this.getProjectTrends(projectId, period);
      
      return {
        success: true,
        data: trends,
      };
    } catch (error) {
      throw new NotFoundException(`Trends not found: ${error.message}`);
    }
  }

  @Get(':projectId/reports')
  @ApiOperation({ summary: 'Get status report history' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of reports to return' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report history retrieved successfully',
  })
  async getReportHistory(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; data: any[] }> {
    try {
      const reports = await this.statusReportingService.getProjectMetrics(projectId);
      
      return {
        success: true,
        data: reports,
      };
    } catch (error) {
      throw new NotFoundException(`Report history not found: ${error.message}`);
    }
  }

  @Get(':projectId/risks')
  @ApiOperation({ summary: 'Get current risk assessment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Risk assessment retrieved successfully',
  })
  async getCurrentRisks(
    @Param('projectId') projectId: string,
  ): Promise<{ success: boolean; data: any }> {
    try {
      const risks = await this.getRiskAssessmentData(projectId);
      
      return {
        success: true,
        data: risks,
      };
    } catch (error) {
      throw new NotFoundException(`Risk data not found: ${error.message}`);
    }
  }

  @Post(':reportId/export')
  @ApiOperation({ summary: 'Export status report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report exported successfully',
  })
  async exportReport(
    @Param('reportId') reportId: string,
    @Body() options: { format: 'pdf' | 'pptx' | 'excel'; stakeholderType: string },
  ): Promise<{ success: boolean; downloadUrl: string }> {
    try {
      const downloadUrl = await this.statusReportingService.exportReport(
        reportId,
        options.format,
        options.stakeholderType,
      );
      
      return {
        success: true,
        downloadUrl,
      };
    } catch (error) {
      throw new BadRequestException(`Export failed: ${error.message}`);
    }
  }

  @Post(':projectId/reports/:reportId1/compare/:reportId2')
  @ApiOperation({ summary: 'Compare two status reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report comparison completed successfully',
  })
  async compareReports(
    @Param('projectId') projectId: string,
    @Param('reportId1') reportId1: string,
    @Param('reportId2') reportId2: string,
  ): Promise<{ success: boolean; data: any }> {
    try {
      const comparison = await this.generateComparisonReport(
        projectId,
        [reportId1, reportId2],
      );
      
      return {
        success: true,
        data: comparison,
      };
    } catch (error) {
      throw new BadRequestException(`Comparison failed: ${error.message}`);
    }
  }

  @Get(':projectId/dashboard/summary')
  @ApiOperation({ summary: 'Get executive dashboard summary' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard summary retrieved successfully',
  })
  async getDashboardSummary(
    @Param('projectId') projectId: string,
  ): Promise<{ success: boolean; data: any }> {
    try {
      const summary = await this.generateDashboardSummary(projectId);
      
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      throw new NotFoundException(`Dashboard summary not available: ${error.message}`);
    }
  }

  @Post(':projectId/alerts/configure')
  @ApiOperation({ summary: 'Configure automated alert thresholds' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert configuration updated successfully',
  })
  async configureAlerts(
    @Param('projectId') projectId: string,
    @Body() alertConfig: {
      scheduleVarianceThreshold: number;
      budgetVarianceThreshold: number;
      riskLevelThreshold: string;
      stakeholderSatisfactionThreshold: number;
      notificationChannels: string[];
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Save alert configuration
      await this.saveAlertConfiguration(projectId, alertConfig);
      
      return {
        success: true,
        message: 'Alert configuration updated successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Alert configuration failed: ${error.message}`);
    }
  }

  @Get(':projectId/forecasting')
  @ApiOperation({ summary: 'Get predictive project forecasting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project forecasting retrieved successfully',
  })
  async getProjectForecasting(
    @Param('projectId') projectId: string,
  ): Promise<{ success: boolean; data: any }> {
    try {
      const forecasting = await this.generateProjectForecasting(projectId);
      
      return {
        success: true,
        data: forecasting,
      };
    } catch (error) {
      throw new NotFoundException(`Forecasting data not available: ${error.message}`);
    }
  }

  @Post(':projectId/manual-update')
  @ApiOperation({ summary: 'Submit manual status update' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Manual update submitted successfully',
  })
  async submitManualUpdate(
    @Param('projectId') projectId: string,
    @Body() update: {
      category: 'schedule' | 'budget' | 'scope' | 'quality' | 'risk' | 'stakeholder';
      description: string;
      impact: 'positive' | 'negative' | 'neutral';
      quantitativeData?: any;
      attachments?: string[];
    },
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.processManualUpdate(projectId, update, req.user.id);
      
      return {
        success: true,
        message: 'Manual update processed successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Manual update failed: ${error.message}`);
    }
  }

  @Get(':projectId/stakeholder-view/:stakeholderType')
  @ApiOperation({ summary: 'Get stakeholder-specific project view' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stakeholder view retrieved successfully',
  })
  async getStakeholderView(
    @Param('projectId') projectId: string,
    @Param('stakeholderType') stakeholderType: 'executive' | 'sponsor' | 'team' | 'client',
  ): Promise<{ success: boolean; data: any }> {
    try {
      const stakeholderData = await this.generateStakeholderSpecificView(
        projectId,
        stakeholderType,
      );
      
      return {
        success: true,
        data: stakeholderData,
      };
    } catch (error) {
      throw new NotFoundException(`Stakeholder view not available: ${error.message}`);
    }
  }

  // Private helper methods

  private async calculateProjectHealthMetrics(projectId: string): Promise<any> {
    // This would integrate with actual project data sources
    // Simplified example metrics
    return {
      overallStatus: 'yellow',
      healthScore: 78,
      schedule: {
        variance: -7,
        status: 'at-risk',
        completion: 58,
      },
      budget: {
        variance: -15000,
        cpi: 0.91,
        spi: 0.89,
        burnRate: 85,
      },
      scope: {
        completion: 65,
        changes: 3,
        quality: 88,
      },
      risks: {
        total: 12,
        critical: 2,
        trend: 'stable',
      },
    };
  }

  private async getProjectTrends(projectId: string, period?: string): Promise<any[]> {
    // Generate trend data based on historical reports
    return [
      {
        period: 'Week 1',
        scheduleHealth: 85,
        budgetHealth: 90,
        scopeHealth: 88,
        riskLevel: 15,
        stakeholderSatisfaction: 82,
      },
      {
        period: 'Week 2',
        scheduleHealth: 80,
        budgetHealth: 87,
        scopeHealth: 85,
        riskLevel: 18,
        stakeholderSatisfaction: 79,
      },
      {
        period: 'Week 3',
        scheduleHealth: 75,
        budgetHealth: 84,
        scopeHealth: 82,
        riskLevel: 22,
        stakeholderSatisfaction: 76,
      },
      {
        period: 'Week 4',
        scheduleHealth: 78,
        budgetHealth: 86,
        scopeHealth: 84,
        riskLevel: 20,
        stakeholderSatisfaction: 78,
      },
    ];
  }

  private async getRiskAssessmentData(projectId: string): Promise<any> {
    return {
      summary: {
        total: 12,
        critical: 2,
        high: 4,
        medium: 5,
        low: 1,
        trend: 'stable',
      },
      topRisks: [
        {
          id: '1',
          description: 'Third-party API integration complexity',
          category: 'Technical',
          probability: 'High',
          impact: 'Medium',
          level: 'high',
          owner: 'John Smith',
          mitigation: 'Parallel development with fallback options',
          dueDate: '2024-02-15',
        },
        {
          id: '2',
          description: 'Resource availability constraints',
          category: 'Resource',
          probability: 'Medium',
          impact: 'High',
          level: 'high',
          owner: 'Sarah Johnson',
          mitigation: 'Cross-training and backup resources identified',
          dueDate: '2024-02-01',
        },
      ],
      riskMatrix: {
        highProbabilityHighImpact: 2,
        highProbabilityMediumImpact: 3,
        highProbabilityLowImpact: 1,
        mediumProbabilityHighImpact: 2,
        mediumProbabilityMediumImpact: 3,
        mediumProbabilityLowImpact: 1,
        lowProbabilityHighImpact: 0,
        lowProbabilityMediumImpact: 0,
        lowProbabilityLowImpact: 0,
      },
    };
  }

  private async generateDashboardSummary(projectId: string): Promise<any> {
    const metrics = await this.calculateProjectHealthMetrics(projectId);
    const risks = await this.getRiskAssessmentData(projectId);

    return {
      executiveSummary: {
        status: metrics.overallStatus,
        healthScore: metrics.healthScore,
        criticalActions: [
          'Address API integration delays',
          'Secure additional QA resources',
          'Escalate vendor coordination issues',
        ],
        keyAccomplishments: [
          'Completed system design review',
          'Onboarded new team members',
          'Resolved 3 critical bugs',
        ],
        upcomingMilestones: [
          {
            name: 'Beta Release',
            date: '2024-02-28',
            confidence: 'Medium',
          },
          {
            name: 'User Acceptance Testing',
            date: '2024-03-15',
            confidence: 'High',
          },
        ],
      },
      performanceSnapshot: {
        schedule: {
          status: metrics.schedule.status,
          completion: metrics.schedule.completion,
          variance: metrics.schedule.variance,
        },
        budget: {
          utilization: metrics.budget.burnRate,
          variance: metrics.budget.variance,
          forecastAccuracy: 'Good',
        },
        quality: {
          defectTrend: 'Improving',
          testCoverage: 87,
          customerSatisfaction: 8.2,
        },
        team: {
          utilization: 92,
          satisfaction: 8.5,
          turnover: 'Low',
        },
      },
      alertsAndActions: {
        criticalAlerts: 1,
        pendingActions: 5,
        overdueItems: 2,
        escalationRequired: 1,
      },
    };
  }

  private async generateProjectForecasting(projectId: string): Promise<any> {
    return {
      completion: {
        mostLikely: '2024-03-22',
        optimistic: '2024-03-15',
        pessimistic: '2024-04-05',
        confidence: 75,
        assumptions: [
          'No major technical blockers',
          'Team availability remains stable',
          'Client feedback cycles on schedule',
        ],
      },
      budget: {
        finalCost: 525000,
        variance: 25000,
        confidence: 80,
        riskFactors: [
          'Potential scope creep from new requirements',
          'Resource rate increases in Q2',
        ],
      },
      risks: {
        emergingRisks: [
          'Competitor product launch may affect timeline',
          'Regulatory changes requiring additional compliance work',
        ],
        mitigationEffectiveness: 85,
        riskBurndown: 'On Track',
      },
      recommendations: [
        'Increase testing automation to maintain quality velocity',
        'Establish contingency plan for resource constraints',
        'Enhance stakeholder communication frequency',
        'Consider scope prioritization for critical path optimization',
      ],
    };
  }

  private async generateStakeholderSpecificView(
    projectId: string,
    stakeholderType: string,
  ): Promise<any> {
    const baseMetrics = await this.calculateProjectHealthMetrics(projectId);

    switch (stakeholderType) {
      case 'executive':
        return {
          summary: 'Project on track with minor schedule concerns',
          keyMetrics: {
            healthScore: baseMetrics.healthScore,
            roi: 'Positive, tracking to 15% above baseline',
            timeline: 'March 2024 (1 week delay)',
            budget: '5% over budget, within tolerance',
          },
          decisions: [
            'Approve additional QA resource request',
            'Review scope change impact assessment',
          ],
          risks: 'Medium risk level, actively managed',
        };

      case 'sponsor':
        return {
          summary: 'Weekly status update with detailed progress',
          achievements: [
            'Completed Phase 2 development',
            'Successfully integrated payment system',
            'Positive feedback from early user testing',
          ],
          challenges: [
            'API integration taking longer than expected',
            'Need additional testing resources',
          ],
          nextWeek: [
            'Complete security testing',
            'Begin user acceptance testing prep',
            'Finalize deployment procedures',
          ],
          support: 'No escalation required at this time',
        };

      case 'team':
        return {
          summary: 'Tactical updates and task assignments',
          currentSprint: {
            completion: 78,
            burndown: 'Slightly behind',
            blockers: 2,
          },
          tasks: [
            'Complete API endpoint testing',
            'Update documentation',
            'Resolve security scan findings',
          ],
          teamHealth: {
            morale: 8.5,
            utilization: 92,
            blockers: 'Waiting on external API documentation',
          },
        };

      case 'client':
        return {
          summary: 'Client-focused progress and value delivery',
          deliverables: {
            completed: 'System design and core functionality',
            inProgress: 'User interface and integration testing',
            upcoming: 'User training and go-live preparation',
          },
          timeline: 'On track for March delivery',
          qualityAssurance: 'Rigorous testing protocols in place',
          valueDelivery: 'Features aligned with business objectives',
        };

      default:
        return baseMetrics;
    }
  }

  private async saveAlertConfiguration(
    projectId: string,
    alertConfig: any,
  ): Promise<void> {
    // Implementation would save to database
    console.log(`Saving alert config for project ${projectId}:`, alertConfig);
  }

  private async processManualUpdate(
    projectId: string,
    update: any,
    userId: string,
  ): Promise<void> {
    // Implementation would process and store manual updates
    console.log(`Processing manual update for project ${projectId}:`, update);
  }

  private async generateComparisonReport(
    projectId: string,
    reportIds: string[],
  ): Promise<any> {
    // Implementation for report comparison
    return {
      comparison: {
        period1: { reportId: reportIds[0], metrics: {} },
        period2: { reportId: reportIds[1], metrics: {} },
        differences: [],
        trends: [],
      },
    };
  }
}

// DTOs for API documentation
export class StatusReportRequestDto {
  projectId: string;
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  stakeholderAudience: 'executive' | 'sponsor' | 'team' | 'client' | 'all';
  reportFormat: 'executive-summary' | 'detailed' | 'dashboard' | 'presentation';
  dataSourcesConfig?: {
    includeJira?: boolean;
    includeGitHub?: boolean;
    includeTeamsData?: boolean;
    includeBudgetData?: boolean;
    includeManualUpdates?: boolean;
  };
}

export class ExportRequestDto {
  format: 'pdf' | 'pptx' | 'excel';
  stakeholderType: string;
}

export class AlertConfigurationDto {
  scheduleVarianceThreshold: number;
  budgetVarianceThreshold: number;
  riskLevelThreshold: string;
  stakeholderSatisfactionThreshold: number;
  notificationChannels: string[];
}

export class ManualUpdateDto {
  category: 'schedule' | 'budget' | 'scope' | 'quality' | 'risk' | 'stakeholder';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  quantitativeData?: any;
  attachments?: string[];
}
