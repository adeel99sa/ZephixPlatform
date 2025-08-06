import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackType } from '../entities/feedback.entity';

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackType, example: FeedbackType.GENERAL })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({
    example:
      "The project creation flow is intuitive, but I'd love project templates.",
  })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ example: 'projects/dashboard' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}
