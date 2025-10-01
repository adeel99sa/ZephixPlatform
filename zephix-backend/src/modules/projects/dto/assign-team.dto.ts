import { IsUUID, IsOptional, IsIn } from 'class-validator';

export class AssignTeamDto {
  @IsUUID()
  teamId: string;

  @IsOptional()
  @IsIn(['developer', 'designer', 'tester', 'manager', 'contributor'])
  role?: string;
}
