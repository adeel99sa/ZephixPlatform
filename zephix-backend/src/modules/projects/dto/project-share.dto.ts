import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ProjectShareDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsIn(['project_manager', 'delivery_owner'])
  accessLevel?: 'project_manager' | 'delivery_owner';
}
