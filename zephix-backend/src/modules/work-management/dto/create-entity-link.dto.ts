import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkEntityType, WorkRelationType } from '../entities/work-entity-link.entity';

export class CreateEntityLinkDto {
  @ApiProperty({ enum: WorkEntityType })
  @IsEnum(WorkEntityType)
  sourceEntityType: WorkEntityType;

  @ApiProperty()
  @IsUUID()
  sourceEntityId: string;

  @ApiProperty({ enum: WorkEntityType })
  @IsEnum(WorkEntityType)
  targetEntityType: WorkEntityType;

  @ApiProperty()
  @IsUUID()
  targetEntityId: string;

  @ApiProperty({ enum: WorkRelationType })
  @IsEnum(WorkRelationType)
  relationType: WorkRelationType;
}
