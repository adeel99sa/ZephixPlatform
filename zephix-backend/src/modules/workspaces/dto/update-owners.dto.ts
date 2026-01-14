import { IsArray, ArrayMinSize, IsUUID } from 'class-validator';

/**
 * PROMPT 6: Update Workspace Owners DTO
 *
 * Rules:
 * - ownerUserIds: Array of user IDs, minimum 1, all must be org members with Member or Admin platform role
 * - Guest users cannot be owners
 * - Must keep at least one owner after update
 */
export class UpdateOwnersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one owner is required' })
  @IsUUID('4', { each: true, message: 'Each owner ID must be a valid UUID' })
  ownerUserIds!: string[];
}
