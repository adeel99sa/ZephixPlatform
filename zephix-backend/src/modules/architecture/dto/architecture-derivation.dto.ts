import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BRDOverviewDto {
  @ApiProperty({ description: 'Project name' })
  @IsString()
  @IsNotEmpty()
  project_name: string;

  @ApiProperty({ description: 'Business objective' })
  @IsString()
  @IsNotEmpty()
  business_objective: string;

  @ApiProperty({ description: 'Problem statement' })
  @IsString()
  @IsNotEmpty()
  problem_statement: string;

  @ApiProperty({ description: 'Proposed solution' })
  @IsString()
  @IsNotEmpty()
  proposed_solution: string;
}

export class BRDScopeDto {
  @ApiProperty({ description: 'Items in scope', type: [String] })
  @IsArray()
  @IsString({ each: true })
  in_scope: string[];

  @ApiProperty({ description: 'Items out of scope', type: [String] })
  @IsArray()
  @IsString({ each: true })
  out_of_scope: string[];

  @ApiProperty({ description: 'Project assumptions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  assumptions: string[];

  @ApiProperty({ description: 'Project constraints', type: [String] })
  @IsArray()
  @IsString({ each: true })
  constraints: string[];
}

export class BRDStakeholdersDto {
  @ApiProperty({ description: 'Business owner' })
  @IsString()
  @IsNotEmpty()
  business_owner: string;

  @ApiProperty({ description: 'Product manager' })
  @IsString()
  @IsNotEmpty()
  product_manager: string;

  @ApiProperty({ description: 'Technical lead' })
  @IsString()
  @IsNotEmpty()
  technical_lead: string;

  @ApiProperty({ description: 'End users', type: [String] })
  @IsArray()
  @IsString({ each: true })
  end_users: string[];
}

export class FunctionalRequirementDto {
  @ApiProperty({ description: 'Requirement ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Requirement title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Requirement description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Priority level',
    enum: ['high', 'medium', 'low'],
  })
  @IsEnum(['high', 'medium', 'low'])
  priority: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Acceptance criteria', type: [String] })
  @IsArray()
  @IsString({ each: true })
  acceptance_criteria: string[];
}

export class PerformanceNFRDto {
  @ApiProperty({ description: 'Response time in milliseconds' })
  @IsNumber()
  response_time_ms: number;

  @ApiProperty({ description: 'Throughput in requests per second' })
  @IsNumber()
  throughput_requests_per_second: number;

  @ApiProperty({ description: 'Concurrent users' })
  @IsNumber()
  concurrent_users: number;
}

export class AvailabilityNFRDto {
  @ApiProperty({ description: 'Uptime percentage' })
  @IsNumber()
  uptime_percentage: number;

  @ApiProperty({ description: 'Recovery time in minutes' })
  @IsNumber()
  recovery_time_minutes: number;
}

export class SecurityNFRDto {
  @ApiProperty({ description: 'Authentication required' })
  @IsBoolean()
  authentication_required: boolean;

  @ApiProperty({ description: 'Data encryption required' })
  @IsBoolean()
  data_encryption: boolean;

  @ApiProperty({ description: 'Audit logging required' })
  @IsBoolean()
  audit_logging: boolean;
}

export class ScalabilityNFRDto {
  @ApiProperty({ description: 'Expected growth factor' })
  @IsNumber()
  expected_growth_factor: number;

  @ApiProperty({ description: 'Horizontal scaling supported' })
  @IsBoolean()
  horizontal_scaling: boolean;
}

export class NonFunctionalRequirementsDto {
  @ApiProperty({ description: 'Performance requirements' })
  @ValidateNested()
  @Type(() => PerformanceNFRDto)
  performance: PerformanceNFRDto;

  @ApiProperty({ description: 'Availability requirements' })
  @ValidateNested()
  @Type(() => AvailabilityNFRDto)
  availability: AvailabilityNFRDto;

  @ApiProperty({ description: 'Security requirements' })
  @ValidateNested()
  @Type(() => SecurityNFRDto)
  security: SecurityNFRDto;

  @ApiProperty({ description: 'Scalability requirements' })
  @ValidateNested()
  @Type(() => ScalabilityNFRDto)
  scalability: ScalabilityNFRDto;
}

export class MilestoneDto {
  @ApiProperty({ description: 'Milestone name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Milestone date' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Milestone deliverables', type: [String] })
  @IsArray()
  @IsString({ each: true })
  deliverables: string[];
}

export class TimelineDto {
  @ApiProperty({ description: 'Project start date' })
  @IsString()
  @IsNotEmpty()
  project_start: string;

  @ApiProperty({ description: 'Project milestones', type: [MilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones: MilestoneDto[];
}

export class RiskDto {
  @ApiProperty({ description: 'Risk ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Risk description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Risk impact', enum: ['high', 'medium', 'low'] })
  @IsEnum(['high', 'medium', 'low'])
  impact: 'high' | 'medium' | 'low';

  @ApiProperty({
    description: 'Risk probability',
    enum: ['high', 'medium', 'low'],
  })
  @IsEnum(['high', 'medium', 'low'])
  probability: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Risk mitigation strategy' })
  @IsString()
  @IsNotEmpty()
  mitigation: string;
}

export class DeriveArchitectureDto {
  @ApiProperty({ description: 'BRD ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'BRD title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Project overview' })
  @ValidateNested()
  @Type(() => BRDOverviewDto)
  overview: BRDOverviewDto;

  @ApiProperty({ description: 'Project scope' })
  @ValidateNested()
  @Type(() => BRDScopeDto)
  scope: BRDScopeDto;

  @ApiProperty({ description: 'Project stakeholders' })
  @ValidateNested()
  @Type(() => BRDStakeholdersDto)
  stakeholders: BRDStakeholdersDto;

  @ApiProperty({
    description: 'Functional requirements',
    type: [FunctionalRequirementDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunctionalRequirementDto)
  functional_requirements: FunctionalRequirementDto[];

  @ApiProperty({ description: 'Non-functional requirements' })
  @ValidateNested()
  @Type(() => NonFunctionalRequirementsDto)
  non_functional_requirements: NonFunctionalRequirementsDto;

  @ApiProperty({ description: 'Project timeline' })
  @ValidateNested()
  @Type(() => TimelineDto)
  timeline: TimelineDto;

  @ApiProperty({ description: 'Project risks', type: [RiskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiskDto)
  risks: RiskDto[];
}

export class ArchitectureReviewDto {
  @ApiProperty({ description: 'Architecture derivation ID' })
  @IsUUID()
  derivation_id: string;

  @ApiProperty({
    description: 'Review decision',
    enum: ['approve', 'request_changes', 'reject'],
  })
  @IsEnum(['approve', 'request_changes', 'reject'])
  decision: 'approve' | 'request_changes' | 'reject';

  @ApiProperty({ description: 'Review comments', required: false })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({
    description: 'Requested changes',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requested_changes?: string[];
}

export class ArchitectureDerivationResponseDto {
  @ApiProperty({ description: 'Derivation ID' })
  id: string;

  @ApiProperty({ description: 'Analysis metadata' })
  analysis_metadata: {
    brd_id: string;
    generated_at: string;
    version: string;
    analyst: string;
  };

  @ApiProperty({ description: 'Key architectural drivers' })
  key_drivers: Array<{
    category: 'business' | 'technical' | 'operational';
    driver: string;
    impact: string;
  }>;

  @ApiProperty({ description: 'Architecture constraints' })
  constraints: Array<{
    type: 'technical' | 'business' | 'regulatory' | 'resource';
    constraint: string;
    rationale: string;
  }>;

  @ApiProperty({ description: 'Architecture options evaluated' })
  architecture_options: Array<{
    option: 'A' | 'B' | 'C';
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    complexity: 'low' | 'medium' | 'high';
    cost: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
  }>;

  @ApiProperty({ description: 'Selected architecture option' })
  selected_option: {
    option: 'A' | 'B' | 'C';
    rationale: string;
    decision_criteria: string[];
  };

  @ApiProperty({ description: 'C4 diagrams in PlantUML format' })
  c4_diagrams: {
    context: string;
    container: string;
    component: string;
  };

  @ApiProperty({ description: 'Architecture Decision Records' })
  adrs: Array<{
    id: string;
    title: string;
    status: 'proposed' | 'accepted' | 'deprecated';
    context: string;
    decision: string;
    consequences: string;
  }>;

  @ApiProperty({ description: 'Threat model with STRIDE analysis' })
  threat_model: Array<{
    asset: string;
    threat: string;
    stride_category:
      | 'spoofing'
      | 'tampering'
      | 'repudiation'
      | 'information_disclosure'
      | 'denial_of_service'
      | 'elevation_of_privilege';
    impact: 'high' | 'medium' | 'low';
    likelihood: 'high' | 'medium' | 'low';
    mitigation: string;
    status: 'open' | 'mitigated' | 'accepted';
  }>;

  @ApiProperty({ description: 'Open questions for stakeholders' })
  open_questions: Array<{
    category: 'technical' | 'business' | 'operational';
    question: string;
    stakeholder: string;
    urgency: 'high' | 'medium' | 'low';
  }>;
}

export class ArchitectureBundleResponseDto {
  @ApiProperty({ description: 'Architecture summary markdown' })
  summary: string;

  @ApiProperty({ description: 'PlantUML diagram files' })
  diagrams: Record<string, string>;

  @ApiProperty({ description: 'ADR markdown files' })
  adrs: Record<string, string>;

  @ApiProperty({ description: 'Risk analysis JSON' })
  risks: any;
}
