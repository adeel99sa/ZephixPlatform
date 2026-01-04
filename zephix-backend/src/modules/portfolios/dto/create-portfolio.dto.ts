import {
  IsString,
  IsOptional,
  IsEnum,
  Length,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PortfolioStatus } from '../entities/portfolio.entity';

export class CreatePortfolioDto {
  @ApiProperty({
    description: 'Portfolio name',
    example: 'Q1 2025 Product Portfolio',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Portfolio description',
    example: 'All product initiatives for Q1 2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: PortfolioStatus,
    description: 'Portfolio status',
    required: false,
    default: PortfolioStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PortfolioStatus)
  status?: PortfolioStatus;
}

