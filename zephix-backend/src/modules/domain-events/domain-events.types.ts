export type DomainEventName = string;

export interface DomainEvent<TData = any> {
  eventId?: string;
  name: DomainEventName;
  type?: DomainEventName; // Alias for name
  orgId: string;
  organizationId?: string; // Alias for orgId
  workspaceId?: string;
  projectId?: string;
  actorId?: string;
  userId?: string;
  occurredAt: Date;
  timestamp?: Date; // Alias for occurredAt
  data: TData;
}

// Specific event types for type safety
export interface TaskCreatedEvent extends DomainEvent {
  name: 'task.created';
  taskId: string;
  projectId: string;
  data: {
    taskId: string;
    projectId: string;
  };
}

export interface TaskUpdatedEvent extends DomainEvent {
  name: 'task.updated';
  taskId: string;
  projectId: string;
  data: {
    taskId: string;
    projectId: string;
  };
}

export interface RiskCreatedEvent extends DomainEvent {
  name: 'risk.created';
  riskId: string;
  projectId?: string;
  data: {
    riskId: string;
    projectId?: string;
  };
}

export interface RiskUpdatedEvent extends DomainEvent {
  name: 'risk.updated';
  riskId: string;
  projectId?: string;
  data: {
    riskId: string;
    projectId?: string;
  };
}

export interface CommentCreatedEvent extends DomainEvent {
  name: 'comment.created';
  commentId: string;
  data: {
    commentId: string;
  };
}

export interface ProjectClonedEvent extends DomainEvent {
  name: 'project.cloned';
  data: {
    newProjectId: string;
    sourceProjectId: string;
    cloneMode: string;
    targetWorkspaceId: string;
    sourceWorkspaceId: string;
    cloneDepth: number;
    entityCounts: {
      phases: number;
      gateDefinitions: number;
      kpiAssignments: number;
      views: number;
      workflowConfig: boolean;
    };
  };
}
