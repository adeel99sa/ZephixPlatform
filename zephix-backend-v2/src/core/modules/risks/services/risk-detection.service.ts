import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk, RiskType, RiskSeverity } from '../entities/risk.entity';
import { Project } from '../../projects/entities/project.entity';
import { ResourceAllocation } from '../../resources/entities/resource-allocation.entity';

@Injectable()
export class RiskDetectionService {
  constructor(
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
  ) {}

  async scanProject(projectId: string, organizationId: string): Promise<Risk[]> {
    const detectedRisks: Risk[] = [];
    
    const overallocationRisk = await this.detectResourceOverallocation(projectId, organizationId);
    if (overallocationRisk) detectedRisks.push(overallocationRisk);

    const scheduleRisk = await this.detectScheduleVariance(projectId, organizationId);
    if (scheduleRisk) detectedRisks.push(scheduleRisk);

    const budgetRisk = await this.detectBudgetVariance(projectId, organizationId);
    if (budgetRisk) detectedRisks.push(budgetRisk);

    return detectedRisks;
  }

  private async detectResourceOverallocation(projectId: string, organizationId: string): Promise<Risk | null> {
    const allocations = await this.allocationRepository.find({
      where: { projectId, organizationId },
    });

    const overallocated = allocations.filter(a => Number(a.allocationPercentage) > 100);
    
    if (overallocated.length > 0) {
      const risk = this.riskRepository.create({
        projectId,
        organizationId,
        type: RiskType.RESOURCE_OVERALLOCATION,
        severity: RiskSeverity.HIGH,
        title: 'Resource Overallocation Detected',
        description: `${overallocated.length} resources are overallocated`,
        evidence: { overallocated: overallocated.map(a => a.resourceId) },
        status: 'identified',
      });
      return this.riskRepository.save(risk);
    }
    return null;
  }

  private async detectScheduleVariance(projectId: string, organizationId: string): Promise<Risk | null> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });

    if (project && project.endDate && project.estimatedEndDate) {
      const variance = new Date(project.endDate).getTime() - new Date(project.estimatedEndDate).getTime();
      const daysDiff = variance / (1000 * 60 * 60 * 24);

      if (daysDiff > 3) {
        const risk = this.riskRepository.create({
          projectId,
          organizationId,
          type: RiskType.SCHEDULE_VARIANCE,
          severity: daysDiff > 7 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
          title: 'Schedule Variance Detected',
          description: `Project is ${Math.floor(daysDiff)} days behind schedule`,
          evidence: { daysBehind: daysDiff },
          status: 'identified',
        });
        return this.riskRepository.save(risk);
      }
    }
    return null;
  }

  private async detectBudgetVariance(projectId: string, organizationId: string): Promise<Risk | null> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });

    if (project && project.budget && project.actualCost) {
      const variance = (Number(project.actualCost) - Number(project.budget)) / Number(project.budget);
      
      if (variance > 0.2) {
        const risk = this.riskRepository.create({
          projectId,
          organizationId,
          type: RiskType.BUDGET_VARIANCE,
          severity: variance > 0.5 ? RiskSeverity.CRITICAL : RiskSeverity.HIGH,
          title: 'Budget Overrun Detected',
          description: `Project is ${(variance * 100).toFixed(1)}% over budget`,
          evidence: { percentageOver: variance * 100 },
          status: 'identified',
        });
        return this.riskRepository.save(risk);
      }
    }
    return null;
  }

  async getRisksByProject(projectId: string, organizationId: string): Promise<Risk[]> {
    return this.riskRepository.find({
      where: { projectId, organizationId },
      order: { detectedAt: 'DESC' },
    });
  }
}
