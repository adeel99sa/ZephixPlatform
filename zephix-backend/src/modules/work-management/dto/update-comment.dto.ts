import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ description: 'Updated comment body' })
  @IsString()
  body: string;
}
