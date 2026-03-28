import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** Mirrors frontend `TemplateWorkflow.creation` — validated on POST /projects/from-template */
export class TemplateWorkflowCreationDto {
  @IsBoolean()
  copyStructure: boolean;

  @IsBoolean()
  copyPhaseGates: boolean;

  @IsBoolean()
  copyAutomations: boolean;

  @IsBoolean()
  assignDefaultRoles: boolean;
}

export class PhaseGateRuleDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  phaseOrder: number;

  @IsArray()
  @IsString({ each: true })
  approverRoles: string[];

  @IsBoolean()
  autoLock: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  /** Maps to `required_checklist.items` on PhaseGateDefinition */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[];
}

export class TemplateWorkflowExecutionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseGateRuleDto)
  phaseGateRules: PhaseGateRuleDto[];
}

export class TemplateWorkflowDto {
  @ValidateNested()
  @Type(() => TemplateWorkflowCreationDto)
  creation: TemplateWorkflowCreationDto;

  @ValidateNested()
  @Type(() => TemplateWorkflowExecutionDto)
  execution: TemplateWorkflowExecutionDto;
}
