import { ArrayMinSize, ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Used by artifact reorder and item reorder endpoints. */
export class ReorderArtifactsDto {
  @ApiProperty({
    type: [String],
    description: 'Artifact ids in desired display order',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  artifactIds: string[];
}

export class ReorderItemsDto {
  @ApiProperty({
    type: [String],
    description: 'Item ids in desired display order',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsUUID(undefined, { each: true })
  itemIds: string[];
}
