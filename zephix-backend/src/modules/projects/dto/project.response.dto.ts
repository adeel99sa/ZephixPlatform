import { Expose, Transform } from 'class-transformer';

export class ProjectResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.name)
  name: string;

  @Expose({ name: 'workspace_id' })
  @Transform(({ obj }) => obj.workspace_id ?? null)
  workspaceId: string | null;

  @Expose({ name: 'organization_id' })
  @Transform(({ obj }) => obj.organization_id)
  organizationId: string;

  @Expose({ name: 'deleted_at' })
  @Transform(({ obj }) => obj.deleted_at)
  deletedAt: string | null;

  @Expose({ name: 'created_at' })
  @Transform(({ obj }) => obj.created_at)
  createdAt: string;

  @Expose({ name: 'updated_at' })
  @Transform(({ obj }) => obj.updated_at)
  updatedAt: string;
}
