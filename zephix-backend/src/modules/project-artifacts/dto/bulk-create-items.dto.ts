import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';

export class BulkCreateItemsDto {
  @ApiProperty({
    type: [CreateItemDto],
    description: 'Up to 200 items per request',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  items: CreateItemDto[];
}

export interface BulkItemValidationError {
  index: number;
  field?: string;
  message: string;
}
