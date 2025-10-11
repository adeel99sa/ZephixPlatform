export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail?: string;
  includes: string[];
  methodology: string;
  estimatedSetup: string;
  teamSize: string;
  tags?: string[];
}

export interface CreateProjectFromTemplateDto {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  templateId: string;
  workspaceId: string;
  organizationId: string;
}

export interface TemplateStructure {
  phases: string[];
  defaultTasks: Array<{
    title: string;
    description?: string;
    phase: string;
    estimatedHours?: number;
  }>;
  kpis: Array<{
    name: string;
    type: string;
    target?: number;
  }>;
}
