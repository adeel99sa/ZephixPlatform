import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class PatchNotificationInboxStateDto {
  @ApiProperty({
    description: 'Notification IDs to update (1–100)',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  notificationIds!: string[];

  @ApiProperty({
    description: 'Set to true to dismiss from the active inbox (user-scoped)',
    example: true,
  })
  @IsBoolean()
  dismissed!: boolean;
}
