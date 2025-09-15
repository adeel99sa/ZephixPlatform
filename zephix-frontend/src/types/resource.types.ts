export interface Resource {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
  capacityHoursPerWeek: number;
  costPerHour: number;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceName?: string;
  projectId: string;
  projectName?: string;
  taskId?: string;
  taskName?: string;
  startDate: string;
  endDate: string;
  hoursPerWeek: number;
  allocationPercentage: number;
}

export interface AllocationConflict {
  resourceId: string;
  resourceName: string;
  week: string;
  currentAllocation: number;
  requestedHours: number;
  totalAllocation: number;
  alternatives: Alternative[];
}

export interface Alternative {
  type: 'resource' | 'timeline' | 'split';
  description: string;
  impact: string;
  confidence: number;
}

export interface WeeklyAllocation {
  weekStart: string;
  resources: {
    resourceId: string;
    resourceName: string;
    allocations: {
      projectId: string;
      projectName: string;
      hours: number;
      percentage: number;
    }[];
    totalHours: number;
    totalPercentage: number;
  }[];
}
