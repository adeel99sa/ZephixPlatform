/**
 * PHASE 7 MODULE 7.4: Bulk Delete Work Items DTO
 */
import { IsString, IsArray, IsUUID, ArrayMaxSize } from 'class-validator';

export class BulkDeleteWorkItemsDto {
  @IsString()
  @IsUUID()
  workspaceId: string;

  @IsString()
  @IsUUID()
  projectId: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(200, { message: 'Maximum 200 items allowed per bulk operation' })
  ids: string[];
}
