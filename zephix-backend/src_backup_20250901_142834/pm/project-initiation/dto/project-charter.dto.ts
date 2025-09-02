import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class ProjectCharterDto {
  @IsString()
  @IsOptional()
  projectTitle?: string;

  @IsString()
  @IsOptional()
  businessCase?: string;

  @IsArray()
  @IsOptional()
  projectObjectives?: string[];

  @IsArray()
  @IsOptional()
  successCriteria?: string[];

  @IsObject()
  @IsOptional()
  scope?: {
    included: string[];
    excluded: string[];
  };

  @IsArray()
  @IsOptional()
  assumptions?: string[];

  @IsArray()
  @IsOptional()
  constraints?: string[];

  @IsObject()
  @IsOptional()
  highLevelTimeline?: {
    startDate: string;
    endDate: string;
    majorMilestones: Array<{
      name: string;
      date: string;
      deliverables: string[];
    }>;
  };

  @IsObject()
  @IsOptional()
  budgetEstimate?: {
    range: string;
    confidence: 'low' | 'medium' | 'high';
    breakdown: Array<{
      category: string;
      percentage: number;
    }>;
  };

  @IsString()
  @IsOptional()
  projectManager?: string;

  @IsString()
  @IsOptional()
  sponsor?: string;

  @IsArray()
  @IsOptional()
  approvalCriteria?: string[];
}
