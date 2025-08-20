import { Injectable, Logger } from '@nestjs/common';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ComplexWorkflowValidationResult extends ValidationResult {
  warnings: string[];
  recommendations: string[];
}

@Injectable()
export class WorkflowValidationService {
  private readonly logger = new Logger(WorkflowValidationService.name);

  validateComplexWorkflow(
    dto: any,
    _manager: any,
  ): ComplexWorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic validation
    if (!dto.name || dto.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }

    if (!dto.stages || dto.stages.length === 0) {
      errors.push('Workflow must have at least one stage');
    }

    if (dto.stages && dto.stages.length > 0) {
      // Validate stage structure
      const stageValidation = this.validateStages(dto.stages);
      errors.push(...stageValidation.errors);
      warnings.push(...stageValidation.warnings);
      recommendations.push(...stageValidation.recommendations);

      // Validate dependencies
      const dependencyValidation = this.validateDependencies(dto.stages);
      errors.push(...dependencyValidation.errors);
      warnings.push(...dependencyValidation.warnings);
    }

    // Validate approvals if present
    if (dto.approvals && dto.approvals.length > 0) {
      const approvalValidation = this.validateApprovals(dto.stages);
      errors.push(...approvalValidation.errors);
      warnings.push(...approvalValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  validateStageTransition(dto: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!dto.workflowInstanceId) {
      errors.push('Workflow instance ID is required');
    }

    if (!dto.stageId) {
      errors.push('Stage ID is required');
    }

    if (!dto.newStatus) {
      errors.push('New status is required');
    }

    if (!dto.userId) {
      errors.push('User ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  validateCompleteWorkflowStructure(
    templateId: string,
    stages: any[],
    _approvals: any[],
    _manager: any,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate that all stages have valid order
    const stageOrders = stages.map((s) => s.order).sort((a, b) => a - b);
    for (let i = 0; i < stageOrders.length; i++) {
      if (stageOrders[i] !== i + 1) {
        errors.push(
          `Stage orders must be sequential starting from 1, found: ${stageOrders.join(', ')}`,
        );
        break;
      }
    }

    // Validate stage dependencies
    if (stages.length > 0) {
      const dependencyValidation = this.validateDependencies(stages);
      errors.push(...dependencyValidation.errors);
      warnings.push(...dependencyValidation.warnings);
      recommendations.push(...dependencyValidation.recommendations);
    }

    return { isValid: errors.length === 0, errors, warnings, recommendations };
  }

  private validateStages(stages: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!stages || stages.length === 0) {
      errors.push('Workflow must have at least one stage');
      return { isValid: false, errors, warnings, recommendations };
    }

    // Check for duplicate stage names
    const stageNames = stages.map((s) => s.name);
    const duplicateNames = stageNames.filter(
      (name, index) => stageNames.indexOf(name) !== index,
    );
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate stage names found: ${duplicateNames.join(', ')}`);
    }

    // Check stage order
    const stageOrders = stages.map((s) => s.order).sort((a, b) => a - b);
    for (let i = 0; i < stageOrders.length; i++) {
      if (stageOrders[i] !== i + 1) {
        errors.push(`Stage order must be sequential starting from 1`);
        break;
      }
    }

    // Validate individual stages
    stages.forEach((stage, index) => {
      if (!stage.name || stage.name.trim() === '') {
        errors.push(`Stage ${index + 1} must have a name`);
      }

      if (stage.estimatedDuration && stage.estimatedDuration <= 0) {
        errors.push(
          `Stage ${stage.name} must have a positive estimated duration`,
        );
      }

      if (
        stage.requiresApproval &&
        (!stage.approvals || stage.approvals.length === 0)
      ) {
        warnings.push(
          `Stage ${stage.name} requires approval but has no approval gates configured`,
        );
      }
    });

    return { isValid: errors.length === 0, errors, warnings, recommendations };
  }

  private validateDependencies(stages: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const stageIds = stages.map((s) => s.id);

    stages.forEach((stage) => {
      if (stage.dependencies) {
        stage.dependencies.forEach((depId: string) => {
          if (!stageIds.includes(depId)) {
            errors.push(
              `Stage ${stage.name} depends on non-existent stage ID: ${depId}`,
            );
          }

          if (depId === stage.id) {
            errors.push(`Stage ${stage.name} cannot depend on itself`);
          }
        });
      }
    });

    // Check for circular dependencies
    const hasCircularDependency = this.checkCircularDependencies(stages);
    if (hasCircularDependency) {
      errors.push('Circular dependencies detected in workflow stages');
    }

    return { isValid: errors.length === 0, errors, warnings, recommendations };
  }

  private validateApprovals(stages: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    stages.forEach((stage) => {
      if (stage.approvals && stage.approvals.length > 0) {
        stage.approvals.forEach((approval: any) => {
          if (!approval.title || approval.title.trim() === '') {
            errors.push(`Approval in stage ${stage.name} must have a title`);
          }

          if (approval.isRequired && approval.canBeSkipped) {
            warnings.push(
              `Approval ${approval.title} in stage ${stage.name} is required but can be skipped`,
            );
          }

          if (approval.dueDate && new Date(approval.dueDate) <= new Date()) {
            warnings.push(
              `Approval ${approval.title} in stage ${stage.name} has a past due date`,
            );
          }
        });
      }
    });

    return { isValid: errors.length === 0, errors, warnings, recommendations };
  }

  private checkCircularDependencies(stages: any[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (node: string) => {
      if (recursionStack.has(node)) {
        return true; // Cycle detected
      }
      if (visited.has(node)) {
        return false; // Already processed
      }

      visited.add(node);
      recursionStack.add(node);

      const stage = stages.find((s) => s.id === node);
      if (stage && stage.dependencies) {
        for (const depId of stage.dependencies) {
          if (visit(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const stage of stages) {
      if (stage.id && visit(stage.id)) {
        return true;
      }
    }
    return false;
  }
}
