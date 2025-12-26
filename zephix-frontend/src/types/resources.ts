export interface Resource {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
  capacityHoursPerWeek: number;
  costPerHour: number;
  isActive: boolean;
  preferences?: any;
  organizationId: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  projectId: string;
  taskId?: string;
  allocationPercentage: number;
  hoursPerWeek?: number;
  startDate: string;
  endDate: string;
  organizationId: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictCheck {
  resourceId: string;
  currentAllocation: number;
  newAllocation: number;
  totalAllocation: number;
  isOverallocated: boolean;
  isCritical: boolean;
  conflicts: ResourceAllocation[];
}

export interface ResourceAllocationResponse {
  resourceId: string;
  allocationPercentage: number;
  allocations: ResourceAllocation[];
  isOverallocated: boolean;
  isCritical: boolean;
}

export interface CreateResourceDto {
  name: string;
  email: string;
  role: string;
  skills?: string[];
  capacityHoursPerWeek: number;
  costPerHour?: number;
  preferences?: any;
}

export interface CreateResourceAllocationDto {
  resourceId: string;
  projectId: string;
  taskId?: string;
  allocationPercentage: number;
  hoursPerWeek?: number;
  startDate: string;
  endDate: string;
}











