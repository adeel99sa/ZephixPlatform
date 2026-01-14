/**
 * PHASE 7 MODULE 7.4: Bulk Update Work Items DTO
 */
import {
  IsString,
  IsArray,
  IsOptional,
  IsUUID,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkItemStatus } from '../entities/work-item.entity';

export class BulkUpdateWorkItemsPatchDto {
  @IsOptional()
  status?: WorkItemStatus;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null; // null allowed to unassign

  @IsOptional()
  dueDate?: string | null; // ISO string, null allowed to clear
}

export class BulkUpdateWorkItemsDto {
  @IsString()
  @IsUUID()
  workspaceId: string;

  @IsString()
  @IsUUID()
  projectId: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(200, {
    message: 'Maximum 200 items allowed per bulk operation',
  })
  ids: string[];

  @ValidateNested()
  @Type(() => BulkUpdateWorkItemsPatchDto)
  patch: BulkUpdateWorkItemsPatchDto;
}
