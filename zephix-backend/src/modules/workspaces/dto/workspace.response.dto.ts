import { Expose, Transform } from 'class-transformer';

export class WorkspaceResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  @Transform(({ obj }) => obj.organization_id)
  organizationId: string;

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
