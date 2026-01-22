import { IsString, IsNotEmpty } from 'class-validator';

/**
 * PROMPT 7: Join Workspace DTO
 */
export class JoinWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
