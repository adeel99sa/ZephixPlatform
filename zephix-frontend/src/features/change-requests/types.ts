export type ChangeRequestImpactScope = 'SCHEDULE' | 'COST' | 'SCOPE' | 'RESOURCE';

export type ChangeRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IMPLEMENTED';

export interface ChangeRequest {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  reason: string | null;
  impactScope: ChangeRequestImpactScope;
  impactCost: string | null;
  impactDays: number | null;
  status: ChangeRequestStatus;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectedByUserId: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  implementedByUserId: string | null;
  implementedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangeRequestInput {
  title: string;
  description?: string;
  reason?: string;
  impactScope: ChangeRequestImpactScope;
  impactCost?: string | null;
  impactDays?: number | null;
}

export interface UpdateChangeRequestInput {
  title?: string;
  description?: string | null;
  reason?: string | null;
  impactScope?: ChangeRequestImpactScope;
  impactCost?: string | null;
  impactDays?: number | null;
}

export interface TransitionInput {
  reason?: string;
}
