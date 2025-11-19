import { Expose, Transform } from 'class-transformer';

export class WorkItemResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.organization_id)
  organizationId: string;

  @Expose()
  @Transform(({ obj }) => obj.workspace_id)
  workspaceId: string;

  @Expose()
  @Transform(({ obj }) => obj.project_id)
  projectId: string;

  @Expose()
  type: string;

  @Expose()
  status: string;

  @Expose()
  title: string;

  @Expose()
  description?: string;

  @Expose()
  @Transform(({ obj }) => obj.assignee_id)
  assigneeId?: string;

  @Expose()
  points?: number;

  @Expose()
  @Transform(({ obj }) => obj.due_date)
  dueDate?: string;

  @Expose()
  @Transform(({ obj }) => obj.created_at)
  createdAt: string;

  @Expose()
  @Transform(({ obj }) => obj.updated_at)
  updatedAt: string;

  @Expose()
  @Transform(({ obj }) => obj.created_by)
  createdBy?: string;

  @Expose()
  @Transform(({ obj }) => obj.updated_by)
  updatedBy?: string;

  @Expose()
  @Transform(({ obj }) => obj.deleted_at)
  deletedAt?: string;

  @Expose()
  @Transform(({ obj }) => obj.deleted_by)
  deletedBy?: string;
}
