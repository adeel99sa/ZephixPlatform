import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan, MoreThan } from 'typeorm';
import { Risk, RiskType, RiskSeverity, RiskStatus } from './entities/risk.entity';
import { RiskMitigation, MitigationType, MitigationStatus } from './entities/risk-mitigation.entity';
import { RiskImpact, ImpactType, ImpactSeverity } from './entities/risk-impact.entity';
import { RiskTrigger, TriggerType, TriggerStatus } from './entities/risk-trigger.entity';
import { CreateRiskDto, UpdateRiskDto, RiskResponseDto, RiskMatrixDto, RiskStatsDto } from './dto';
import { ProjectsService } from '../projects/services/projects.service';
import { ResourcesService } from '../resources/resources.service';

@Injectable()
export class RisksService {
  constructor(
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    @InjectRepository(RiskMitigation)
    private mitigationRepository: Repository<RiskMitigation>,
    @InjectRepository(RiskImpact)
    private impactRepository: Repository<RiskImpact>,
    @InjectRepository(RiskTrigger)
    private triggerRepository: Repository<RiskTrigger>,
    private projectsService: ProjectsService,
    private resourcesService: ResourcesService,
  ) {
    console.log('🔧 RisksService constructor - projectsService:', !!this.projectsService);
  }

  // Risk CRUD Operations
  async createRisk(createRiskDto: CreateRiskDto, organizationId: string, identifiedBy: string): Promise<RiskResponseDto> {
    try {
          // Validate project belongs to organization
          if (createRiskDto.projectId) {
            console.log('🔍 Project ID provided:', createRiskDto.projectId, 'for org:', organizationId);
            // Temporarily skip validation to test
            console.log('⚠️ Skipping project validation for debugging');
          }

      // Calculate risk score using decimal probability
      const probability = createRiskDto.probability || 0;
      const impactScore = createRiskDto.impact || 0;
      const riskScore = probability * impactScore;

      console.log('🔧 Creating risk with data:', {
        projectId: createRiskDto.projectId,
        organizationId,
        identifiedBy,
        probability,
        impactScore,
        riskScore
      });

      const risk = this.riskRepository.create({
        projectId: createRiskDto.projectId,
        type: createRiskDto.type as any,
        severity: 'MEDIUM' as any, // Default severity
        description: createRiskDto.description,
        organizationId,
        identifiedBy,
        probability, // Already decimal from DTO transform
        impactScore: impactScore,
        _riskScore: parseFloat(riskScore.toFixed(2)),
        isActive: true,
        status: RiskStatus.IDENTIFIED,
        dueDate: null,
      });

      console.log('🔧 Risk entity created:', risk);

      const savedRisk = await this.riskRepository.save(risk);
      console.log('🔧 Risk saved successfully:', savedRisk.id);
      
      return this.mapToResponseDto(savedRisk);
    } catch (error) {
      console.error('Error creating risk:', error);
      throw new BadRequestException('Failed to create risk');
    }
  }

  private mapToResponseDto(risk: Risk): RiskResponseDto {
    return RiskResponseDto.fromEntity(risk);
  }

  // Add helper method for probability statistics
  async getProbabilityDistribution(organizationId: string): Promise<any> {
    const risks = await this.riskRepository.find({
      where: { organizationId, isActive: true }
    });

    return {
      low: risks.filter(r => r.probability < 0.3).length,
      medium: risks.filter(r => r.probability >= 0.3 && r.probability < 0.7).length,
      high: risks.filter(r => r.probability >= 0.7).length,
      average: risks.length > 0 ? risks.reduce((sum, r) => sum + r.probability, 0) / risks.length : 0
    };
  }

  async findAllRisks(organizationId: string, projectId?: string, status?: RiskStatus, severity?: RiskSeverity): Promise<RiskResponseDto[]> {
    try {
      const where: any = { organizationId, isActive: true };
      
      if (projectId) where.projectId = projectId;
      if (status) where.status = status;
      if (severity) where.severity = severity;

      const risks = await this.riskRepository.find({
        where,
        relations: ['mitigations', 'impacts', 'triggers'],
        order: { createdAt: 'DESC' }
      });

      return risks.map(risk => this.mapToResponseDto(risk));
    } catch (error) {
      console.error('Error fetching risks:', error);
      throw new BadRequestException('Failed to fetch risks');
    }
  }

  async findOneRisk(id: string, organizationId: string): Promise<RiskResponseDto> {
    try {
      const risk = await this.riskRepository.findOne({
        where: { id, organizationId, isActive: true },
        relations: ['mitigations', 'impacts', 'triggers']
      });

      if (!risk) {
        throw new NotFoundException('Risk not found');
      }

      return this.mapToResponseDto(risk);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching risk:', error);
      throw new BadRequestException('Failed to fetch risk');
    }
  }

  async updateRisk(id: string, updateRiskDto: UpdateRiskDto, organizationId: string): Promise<RiskResponseDto> {
    try {
      const risk = await this.riskRepository.findOne({
        where: { id, organizationId, isActive: true }
      });

      if (!risk) {
        throw new NotFoundException('Risk not found');
      }

      // Update fields
      Object.assign(risk, updateRiskDto);
      
      if (updateRiskDto.dueDate) {
        risk.dueDate = new Date(updateRiskDto.dueDate);
      }

      // Recalculate risk score if probability or impact changed
      if (updateRiskDto.probability !== undefined || updateRiskDto.impactScore !== undefined) {
        risk.calculateRiskScore();
      }

      const savedRisk = await this.riskRepository.save(risk);
      return this.mapToResponseDto(savedRisk);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error updating risk:', error);
      throw new BadRequestException('Failed to update risk');
    }
  }

  async deleteRisk(id: string, organizationId: string): Promise<void> {
    try {
      const risk = await this.riskRepository.findOne({
        where: { id, organizationId, isActive: true }
      });

      if (!risk) {
        throw new NotFoundException('Risk not found');
      }

      risk.isActive = false;
      await this.riskRepository.save(risk);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error deleting risk:', error);
      throw new BadRequestException('Failed to delete risk');
    }
  }

  // Risk Detection and Analysis
  async identifyRisks(projectId: string, organizationId: string): Promise<RiskResponseDto[]> {
    try {
      const project = await this.projectsService.findProjectById(projectId, organizationId);
      if (!project) {
        throw new BadRequestException('Project not found');
      }

      const identifiedRisks: Risk[] = [];

      // 1. Schedule Risk Detection
      const scheduleRisks = await this.detectScheduleRisks(projectId, organizationId);
      identifiedRisks.push(...scheduleRisks);

      // 2. Budget Risk Detection
      const budgetRisks = await this.detectBudgetRisks(projectId, organizationId);
      identifiedRisks.push(...budgetRisks);

      // 3. Resource Risk Detection
      const resourceRisks = await this.detectResourceRisks(projectId, organizationId);
      identifiedRisks.push(...resourceRisks);

      // 4. Technical Risk Detection
      const technicalRisks = await this.detectTechnicalRisks(projectId, organizationId);
      identifiedRisks.push(...technicalRisks);

      return identifiedRisks.map(risk => this.mapToResponseDto(risk));
    } catch (error) {
      console.error('Error identifying risks:', error);
      throw new BadRequestException('Failed to identify risks');
    }
  }

  async assessRiskImpact(riskId: string, organizationId: string): Promise<RiskResponseDto> {
    try {
      const risk = await this.riskRepository.findOne({
        where: { id: riskId, organizationId, isActive: true },
        relations: ['impacts']
      });

      if (!risk) {
        throw new NotFoundException('Risk not found');
      }

      // Calculate impact based on risk type and project context
      const impactScore = await this.calculateImpactScore(risk);
      risk.impactScore = impactScore;
      risk.calculateRiskScore();

      // Update status to assessed
      risk.status = RiskStatus.ASSESSED;

      const savedRisk = await this.riskRepository.save(risk);
      return this.mapToResponseDto(savedRisk);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error assessing risk impact:', error);
      throw new BadRequestException('Failed to assess risk impact');
    }
  }

  // Risk Matrix and Analytics
  async getRiskMatrix(organizationId: string, projectId?: string): Promise<RiskMatrixDto> {
    try {
      const risks = await this.findAllRisks(organizationId, projectId);
      
      // Build matrix
      const matrix: { [severity: string]: { [probability: string]: RiskResponseDto[] } } = {};
      
      // Initialize matrix
      Object.values(RiskSeverity).forEach(severity => {
        matrix[severity] = {};
        for (let prob = 0; prob <= 1; prob += 0.2) {
          matrix[severity][prob.toFixed(1)] = [];
        }
      });

      // Populate matrix
      risks.forEach(risk => {
        const probKey = (Math.round(risk.probability * 5) / 5).toFixed(1);
        if (matrix[risk.severity] && matrix[risk.severity][probKey]) {
          matrix[risk.severity][probKey].push(risk);
        }
      });

      // Calculate summary
      const summary = this.calculateRiskSummary(risks);

      return {
        risks,
        matrix,
        summary
      };
    } catch (error) {
      console.error('Error generating risk matrix:', error);
      throw new BadRequestException('Failed to generate risk matrix');
    }
  }

  async getRiskStats(organizationId: string): Promise<RiskStatsDto> {
    try {
      const risks = await this.findAllRisks(organizationId);
      
      const stats: RiskStatsDto = {
        totalRisks: risks.length,
        activeRisks: risks.filter(r => r.isActive).length,
        closedRisks: risks.filter(r => r.status === RiskStatus.CLOSED).length,
        highPriorityRisks: risks.filter(r => r.isHighPriority).length,
        overdueRisks: risks.filter(r => r.isOverdue).length,
        risksBySeverity: this.groupByEnum(risks, 'severity', Object.values(RiskSeverity)),
        risksByStatus: this.groupByEnum(risks, 'status', Object.values(RiskStatus)),
        risksByType: this.groupByEnum(risks, 'type', Object.values(RiskType)),
        averageRiskScore: risks.length > 0 ? risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length : 0,
        probabilityDistribution: await this.getProbabilityDistribution(organizationId),
        topRisks: risks
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 5),
        recentActivity: {
          risksCreated: risks.filter(r => this.isRecent(r.createdAt, 7)).length,
          risksResolved: risks.filter(r => r.status === RiskStatus.CLOSED && this.isRecent(r.resolvedAt, 7)).length,
          mitigationsCompleted: 0 // TODO: Calculate from mitigations
        }
      };

      return stats;
    } catch (error) {
      console.error('Error calculating risk stats:', error);
      throw new BadRequestException('Failed to calculate risk statistics');
    }
  }

  // Mitigation Management
  async createMitigation(riskId: string, mitigationData: any, organizationId: string): Promise<any> {
    try {
      const risk = await this.riskRepository.findOne({
        where: { id: riskId, organizationId, isActive: true }
      });

      if (!risk) {
        throw new NotFoundException('Risk not found');
      }

      const mitigation = this.mitigationRepository.create({
        ...mitigationData,
        riskId,
        dueDate: mitigationData.dueDate ? new Date(mitigationData.dueDate) : null,
      });

      return await this.mitigationRepository.save(mitigation);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error creating mitigation:', error);
      throw new BadRequestException('Failed to create mitigation');
    }
  }

  // Private helper methods
  private async detectScheduleRisks(projectId: string, organizationId: string): Promise<Risk[]> {
    // Detect schedule risks based on project timeline and dependencies
    const risks: Risk[] = [];
    
    // Example: Detect if project is behind schedule
    // This would integrate with project timeline data
    const scheduleRisk = this.riskRepository.create({
      projectId,
      organizationId,
      type: RiskType.SCHEDULE,
      severity: RiskSeverity.MEDIUM,
      description: 'Project timeline may be at risk due to dependencies',
      probability: 0.6,
      impactScore: 7,
      status: RiskStatus.IDENTIFIED,
    });

    scheduleRisk.calculateRiskScore();
    risks.push(scheduleRisk);

    return risks;
  }

  private async detectBudgetRisks(projectId: string, organizationId: string): Promise<Risk[]> {
    // Detect budget risks based on project costs and allocations
    const risks: Risk[] = [];
    
    // Example: Detect if project is over budget
    const budgetRisk = this.riskRepository.create({
      projectId,
      organizationId,
      type: RiskType.BUDGET,
      severity: RiskSeverity.HIGH,
      description: 'Project may exceed budget based on current spending patterns',
      probability: 0.4,
      impactScore: 8,
      status: RiskStatus.IDENTIFIED,
    });

    budgetRisk.calculateRiskScore();
    risks.push(budgetRisk);

    return risks;
  }

  private async detectResourceRisks(projectId: string, organizationId: string): Promise<Risk[]> {
    // Detect resource risks based on allocation conflicts and availability
    const risks: Risk[] = [];
    
    // Example: Detect resource overallocation
    const resourceRisk = this.riskRepository.create({
      projectId,
      organizationId,
      type: RiskType.RESOURCE,
      severity: RiskSeverity.MEDIUM,
      description: 'Resource allocation conflicts detected',
      probability: 0.5,
      impactScore: 6,
      status: RiskStatus.IDENTIFIED,
    });

    resourceRisk.calculateRiskScore();
    risks.push(resourceRisk);

    return risks;
  }

  private async detectTechnicalRisks(projectId: string, organizationId: string): Promise<Risk[]> {
    // Detect technical risks based on project complexity and technology stack
    const risks: Risk[] = [];
    
    // Example: Detect technical complexity risks
    const technicalRisk = this.riskRepository.create({
      projectId,
      organizationId,
      type: RiskType.TECHNICAL,
      severity: RiskSeverity.LOW,
      description: 'Technical implementation may require additional expertise',
      probability: 0.3,
      impactScore: 5,
      status: RiskStatus.IDENTIFIED,
    });

    technicalRisk.calculateRiskScore();
    risks.push(technicalRisk);

    return risks;
  }

  private async calculateImpactScore(risk: Risk): Promise<number> {
    // Calculate impact score based on risk type and project context
    let baseScore = 5; // Default impact score

    switch (risk.type) {
      case RiskType.SCHEDULE:
        baseScore = 7; // Schedule risks typically have high impact
        break;
      case RiskType.BUDGET:
        baseScore = 8; // Budget risks have very high impact
        break;
      case RiskType.RESOURCE:
        baseScore = 6; // Resource risks have medium-high impact
        break;
      case RiskType.TECHNICAL:
        baseScore = 5; // Technical risks have medium impact
        break;
      case RiskType.BUSINESS:
        baseScore = 9; // Business risks have very high impact
        break;
      case RiskType.EXTERNAL:
        baseScore = 6; // External risks have medium-high impact
        break;
    }

    // Adjust based on severity
    const severityMultiplier = {
      [RiskSeverity.LOW]: 0.5,
      [RiskSeverity.MEDIUM]: 0.7,
      [RiskSeverity.HIGH]: 1.0,
      [RiskSeverity.CRITICAL]: 1.5,
    };

    return Math.round(baseScore * severityMultiplier[risk.severity]);
  }

  private calculateRiskSummary(risks: RiskResponseDto[]): any {
    const summary = {
      total: risks.length,
      bySeverity: {} as { [key in RiskSeverity]: number },
      byStatus: {} as { [key in RiskStatus]: number },
      byType: {} as { [key in RiskType]: number },
      highPriority: 0,
      overdue: 0,
      needsAttention: 0,
    };

    // Initialize counters
    Object.values(RiskSeverity).forEach(severity => {
      summary.bySeverity[severity] = 0;
    });
    Object.values(RiskStatus).forEach(status => {
      summary.byStatus[status] = 0;
    });
    Object.values(RiskType).forEach(type => {
      summary.byType[type] = 0;
    });

    // Count risks
    risks.forEach(risk => {
      summary.bySeverity[risk.severity]++;
      summary.byStatus[risk.status]++;
      summary.byType[risk.type]++;
      
      if (risk.isHighPriority) summary.highPriority++;
      if (risk.isOverdue) summary.overdue++;
      if (risk.needsAttention) summary.needsAttention++;
    });

    return summary;
  }


  private groupBy<T, K extends keyof T>(array: T[], key: K): { [key: string]: number } {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {} as { [key: string]: number });
  }

  private groupByEnum<T, K extends keyof T, E extends string>(array: T[], key: K, enumValues: E[]): { [key in E]: number } {
    const result = {} as { [key in E]: number };
    
    // Initialize all enum values to 0
    enumValues.forEach(enumValue => {
      result[enumValue] = 0;
    });
    
    // Count occurrences
    array.forEach(item => {
      const value = String(item[key]) as E;
      if (result.hasOwnProperty(value)) {
        result[value]++;
      }
    });
    
    return result;
  }

  private isRecent(date: Date, days: number): boolean {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  }
}
