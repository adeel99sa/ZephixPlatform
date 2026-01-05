import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({ description: 'Comment body', example: 'This task needs more clarification' })
  @IsString()
  @MinLength(1)
  body: string;
}

