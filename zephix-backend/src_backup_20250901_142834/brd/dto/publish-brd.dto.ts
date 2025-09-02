import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BRDStatus } from '../entities/brd.entity';

export class PublishBRDDto {
  @ApiProperty({
    description: 'Target status for the BRD',
    enum: BRDStatus,
    example: BRDStatus.APPROVED,
  })
  @IsEnum(BRDStatus)
  @IsNotEmpty()
  status: BRDStatus;
}
