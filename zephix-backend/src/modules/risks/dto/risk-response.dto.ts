import { Risk } from '../entities/risk.entity';

export class RiskResponseDto {
  id: string;
  projectId: string;
  organizationId: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  mitigationPlan?: string;
  probability: number; // Decimal
  probabilityPercentage: number; // For display
  impactScore: number;
  riskScore: number;
  identifiedBy?: string;
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Display helpers
  probabilityDisplay: string;
  riskScoreDisplay: string;

  // Computed properties
  isHighPriority: boolean;
  isOverdue: boolean;
  needsAttention: boolean;

  static fromEntity(risk: Risk): RiskResponseDto {
    // Ensure numeric values are properly converted
    const probability = typeof risk.probability === 'string' ? parseFloat(risk.probability) : risk.probability;
    const impactScore = typeof risk.impactScore === 'string' ? parseInt(risk.impactScore) : risk.impactScore;
    const riskScore = typeof risk.riskScore === 'string' ? parseFloat(risk.riskScore) : risk.riskScore;
    
    return {
      id: risk.id,
      projectId: risk.projectId,
      organizationId: risk.organizationId,
      type: risk.type,
      severity: risk.severity,
      status: risk.status,
      description: risk.description,
      mitigationPlan: risk.mitigationPlan,
      probability: probability,
      probabilityPercentage: probability * 100,
      impactScore: impactScore,
      riskScore: riskScore,
      identifiedBy: risk.identifiedBy,
      assignedTo: risk.assignedTo,
      dueDate: risk.dueDate,
      resolvedAt: risk.resolvedAt,
      resolutionNotes: risk.resolutionNotes,
      isActive: risk.isActive,
      createdAt: risk.createdAt,
      updatedAt: risk.updatedAt,
      // Format for display
      probabilityDisplay: `${(probability * 100).toFixed(1)}%`,
      riskScoreDisplay: riskScore.toFixed(2),
      // Computed properties
      isHighPriority: risk.isHighPriority(),
      isOverdue: risk.isOverdue,
      needsAttention: risk.needsAttention()
    };
  }
}