import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkEntityType } from '../entities/work-entity-link.entity';

export class GetEntityLinksQuery {
  @ApiPropertyOptional({ enum: WorkEntityType })
  @IsOptional()
  @IsEnum(WorkEntityType)
  entityType?: WorkEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
