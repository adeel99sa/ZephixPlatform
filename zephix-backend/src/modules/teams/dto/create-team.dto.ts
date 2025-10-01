import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
