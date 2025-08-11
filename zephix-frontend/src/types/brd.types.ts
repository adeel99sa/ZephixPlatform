// BRD Types for Project Planning Feature

export interface BRD {
  id: string;
  organizationId: string;
  project_id: string | null;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  payload: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Helper methods
  getTitle(): string;
  getSummary(): string;
  getIndustry(): string;
  getDepartment(): string;
  getPriority(): string;
  getCompletionPercentage(): number;
}

export interface BRDAnalysisResult {
  id: string;
  brdId: string;
  organizationId: string;
  analysisType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidenceScore?: number;
  results: {
    summary: string;
    keyRequirements: string[];
    businessObjectives: string[];
    stakeholders: string[];
    constraints: string[];
    assumptions: string[];
    risks: string[];
    opportunities: string[];
  };
  metadata: {
    model: string;
    processingTime: number;
    tokensUsed: number;
  };
  created_at: string;
  updated_at: string;
}

export interface GeneratedProjectPlan {
  id: string;
  analysisId: string;
  brdId: string;
  organizationId: string;
  methodology: string;
  status: 'draft' | 'reviewed' | 'approved' | 'implemented';
  
  plan: {
    overview: {
      projectName: string;
      description: string;
      objectives: string[];
      successCriteria: string[];
    };
    timeline: {
      estimatedDuration: string;
      phases: ProjectPhase[];
      milestones: Milestone[];
    };
    resources: {
      teamSize: number;
      roles: Role[];
      skills: string[];
      budget: {
        estimated: number;
        currency: string;
        breakdown: BudgetItem[];
      };
    };
    methodology: {
      name: string;
      description: string;
      phases: string[];
      artifacts: string[];
    };
    risks: Risk[];
    quality: QualityMetrics;
  };
  
  metadata: {
    generatedBy: string;
    confidenceScore: number;
    refinementCount: number;
  };
  
  created_at: string;
  updated_at: string;
}

export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  duration: string;
  deliverables: string[];
  dependencies: string[];
  resources: string[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  criteria: string[];
  dependencies: string[];
}

export interface Role {
  title: string;
  responsibilities: string[];
  skills: string[];
  effort: string;
  reportingTo?: string;
}

export interface BudgetItem {
  category: string;
  description: string;
  amount: number;
  notes?: string;
}

export interface Risk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  owner: string;
}

export interface QualityMetrics {
  codeCoverage: number;
  testAutomation: number;
  documentation: number;
  performance: number;
  security: number;
}

export interface ProjectCreationData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  teamMembers: string[];
  methodology: string;
  phases: ProjectPhase[];
}
