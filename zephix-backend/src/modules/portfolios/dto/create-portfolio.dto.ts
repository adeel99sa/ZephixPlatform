import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  Length,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PortfolioStatus,
  PortfolioGovernanceMode,
} from '../entities/portfolio.entity';

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

  // ── Wave 8: Governance flags ────────────────────────────────────────

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  costTrackingEnabled?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  baselinesEnabled?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  iterationsEnabled?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  changeManagementEnabled?: boolean;

  @ApiProperty({
    enum: PortfolioGovernanceMode,
    required: false,
    default: PortfolioGovernanceMode.PORTFOLIO_DEFAULTS,
  })
  @IsOptional()
  @IsIn([
    PortfolioGovernanceMode.PORTFOLIO_DEFAULTS,
    PortfolioGovernanceMode.PROJECT_OVERRIDES_ALLOWED,
  ])
  inheritedGovernanceMode?: PortfolioGovernanceMode;
}
