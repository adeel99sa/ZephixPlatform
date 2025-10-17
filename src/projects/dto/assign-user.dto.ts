import { IsUUID, IsOptional, IsIn } from 'class-validator';

export class AssignUserDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsIn(['owner', 'manager', 'contributor', 'viewer'])
  role?: string;
}

