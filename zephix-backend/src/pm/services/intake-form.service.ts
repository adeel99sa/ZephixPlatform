import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { IntakeForm } from '../entities/intake-form.entity';
import { IntakeSubmission } from '../entities/intake-submission.entity';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import {
  CreateIntakeFormDto,
  UpdateIntakeFormDto,
  IntakeSubmissionDto,
  ProcessIntakeDto,
  SubmissionListQueryDto,
  BulkSubmissionActionDto,
} from '../dto/intake-form.dto';
import { WorkflowTemplateService } from './workflow-template.service';
import { IntegrationService } from './integration.service';
import slugify from 'slugify';

@Injectable()
export class IntakeFormService {
  constructor(
    @InjectRepository(IntakeForm)
    private formRepository: Repository<IntakeForm>,
    @InjectRepository(IntakeSubmission)
    private submissionRepository: Repository<IntakeSubmission>,
    @InjectRepository(WorkflowTemplate)
    private templateRepository: Repository<WorkflowTemplate>,
    private workflowService: WorkflowTemplateService,
    private integrationService: IntegrationService,
  ) {}

  async getForms(organizationId: string) {
    const forms = await this.formRepository.find({
      where: { organizationId },
      relations: ['targetWorkflow', 'submissions'],
      order: { createdAt: 'DESC' },
    });

    return forms.map((form) => ({
      ...form,
      submissionCount: form.submissions?.length || 0,
      lastSubmissionAt: form.analytics?.lastSubmissionAt,
    }));
  }

  async getFormById(
    organizationId: string,
    formId: string,
  ): Promise<IntakeForm> {
    const form = await this.formRepository.findOne({
      where: { id: formId, organizationId },
      relations: ['targetWorkflow', 'submissions'],
    });

    if (!form) {
      throw new NotFoundException('Intake form not found');
    }

    return form;
  }

  async createForm(
    organizationId: string,
    createDto: CreateIntakeFormDto,
    userId: string,
  ): Promise<IntakeForm> {
    // Generate unique slug if not provided or validate existing slug
    const slug = await this.generateUniqueSlug(
      createDto.slug || createDto.name,
    );

    // Validate target workflow if provided
    if (createDto.targetWorkflowId) {
      await this.workflowService.findById(
        organizationId,
        createDto.targetWorkflowId,
      );
    }

    // Validate form schema
    this.validateFormSchema(createDto.formSchema);

    const form = this.formRepository.create({
      ...createDto,
      slug,
      organizationId,
      analytics: {
        totalViews: 0,
        totalSubmissions: 0,
        conversionRate: 0,
      },
    } as any);

    return (await this.formRepository.save(form)) as any;
  }

  async updateForm(
    organizationId: string,
    formId: string,
    updateDto: UpdateIntakeFormDto,
  ): Promise<IntakeForm> {
    const form = await this.getFormById(organizationId, formId);

    // Validate slug uniqueness if changed
    if (updateDto.slug && updateDto.slug !== form.slug) {
      const slugExists = await this.formRepository.findOne({
        where: { slug: updateDto.slug },
      });
      if (slugExists) {
        throw new ConflictException('Slug already exists');
      }
    }

    // Validate target workflow if changed
    if (
      updateDto.targetWorkflowId &&
      updateDto.targetWorkflowId !== form.targetWorkflowId
    ) {
      await this.workflowService.findById(
        organizationId,
        updateDto.targetWorkflowId,
      );
    }

    // Validate form schema if provided
    if (updateDto.formSchema) {
      this.validateFormSchema(updateDto.formSchema);
    }

    Object.assign(form, updateDto);
    return await this.formRepository.save(form);
  }

  async deleteForm(organizationId: string, formId: string): Promise<void> {
    const form = await this.getFormById(organizationId, formId);

    // Check if there are pending submissions
    const pendingSubmissions = await this.submissionRepository.count({
      where: { formId, status: 'pending' },
    });

    if (pendingSubmissions > 0) {
      throw new ConflictException(
        'Cannot delete form with pending submissions',
      );
    }

    await this.formRepository.remove(form);
  }

  async getPublicForm(slug: string): Promise<IntakeForm> {
    const form = await this.formRepository.findOne({
      where: { slug, isPublic: true, isActive: true },
    });

    if (!form) {
      throw new NotFoundException('Form not found or not accessible');
    }

    // Increment view count
    form.incrementViews();
    await this.formRepository.save(form);

    return form;
  }

  async submitIntake(
    slug: string,
    submissionDto: IntakeSubmissionDto,
    userId?: string,
  ): Promise<IntakeSubmission> {
    const form = await this.getPublicForm(slug);

    // Validate submission data against form schema
    const validationErrors = this.validateSubmissionData(
      form,
      submissionDto.formData,
    );
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // Determine submitter information
    const submitterInfo = this.extractSubmitterInfo(submissionDto, userId);

    // Create submission
    const submission = this.submissionRepository.create({
      ...submissionDto,
      formId: form.id,
      organizationId: form.organizationId,
      submittedBy: userId,
      ...submitterInfo,
      data: {
        formData: submissionDto.formData,
        metadata: {
          ...submissionDto.metadata,
          submissionTime: new Date(),
          ipAddress: '', // Would be filled from request in controller
          userAgent: '', // Would be filled from request in controller
        },
      },
      dueDate: submissionDto.dueDate ? new Date(submissionDto.dueDate) : null,
    } as any);

    const savedSubmission = (await this.submissionRepository.save(
      submission,
    )) as any;

    // Update form analytics
    form.incrementSubmissions();
    await this.formRepository.save(form);

    // Process auto-assignments
    await this.processAutoAssignments(form, savedSubmission);

    // Trigger integrations
    await this.triggerIntegrations(form, savedSubmission);

    // Auto-create workflow instance if configured
    if (form.targetWorkflowId) {
      await this.autoCreateWorkflowInstance(form, savedSubmission);
    }

    return savedSubmission;
  }

  async getSubmissions(organizationId: string, query: SubmissionListQueryDto) {
    const {
      search,
      status,
      priority,
      formId,
      assignedTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
    } = query;

    const where: FindOptionsWhere<IntakeSubmission> = {
      organizationId,
    };

    if (search) {
      where.title = Like(`%${search}%`);
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (formId) {
      where.formId = formId;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (dateFrom || dateTo) {
      where.createdAt = Between(
        dateFrom ? new Date(dateFrom) : new Date('1970-01-01'),
        dateTo ? new Date(dateTo) : new Date(),
      );
    }

    const [submissions, total] = await this.submissionRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['form', 'submitter', 'assignedUser', 'workflowInstance'],
    });

    return {
      data: submissions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubmissionById(
    organizationId: string,
    submissionId: string,
  ): Promise<IntakeSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId, organizationId },
      relations: [
        'form',
        'submitter',
        'assignedUser',
        'processor',
        'workflowInstance',
      ],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  async processIntoProject(
    organizationId: string,
    submissionId: string,
    processDto: ProcessIntakeDto,
    userId: string,
  ): Promise<IntakeSubmission> {
    const submission = await this.getSubmissionById(
      organizationId,
      submissionId,
    );

    if (!submission.canBeProcessed()) {
      throw new BadRequestException(
        'Submission cannot be processed in its current state',
      );
    }

    // Mark as processing
    submission.status = 'processing';
    await this.submissionRepository.save(submission);

    try {
      // Create workflow instance if requested
      if (processDto.createProject && processDto.workflowTemplateId) {
        const workflowInstance = await this.workflowService.createInstance(
          organizationId,
          {
            templateId: processDto.workflowTemplateId,
            title: processDto.projectTitle || submission.title,
            description:
              processDto.projectDescription || submission.description,
            data: {
              sourceType: 'intake',
              sourceId: submission.id,
              intakeData: submission.data.formData,
            },
            assignedTo: processDto.assignTo,
            priority: submission.priority as any,
          },
          userId,
        );

        submission.workflowInstanceId = workflowInstance.id;
      }

      // Assign if specified
      if (processDto.assignTo) {
        submission.assignedTo = processDto.assignTo;
      }

      // Mark as processed
      submission.markAsProcessed(userId, processDto.notes);

      return await this.submissionRepository.save(submission);
    } catch (error) {
      // Revert status on error
      submission.status = 'pending';
      await this.submissionRepository.save(submission);
      throw error;
    }
  }

  async bulkAction(
    organizationId: string,
    bulkActionDto: BulkSubmissionActionDto,
    userId: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] };

    for (const submissionId of bulkActionDto.submissionIds) {
      try {
        const submission = await this.getSubmissionById(
          organizationId,
          submissionId,
        );

        switch (bulkActionDto.action) {
          case 'assign':
            if (bulkActionDto.assignTo) {
              submission.assignedTo = bulkActionDto.assignTo;
              await this.submissionRepository.save(submission);
            }
            break;

          case 'change_priority':
            if (bulkActionDto.priority) {
              submission.priority = bulkActionDto.priority;
              await this.submissionRepository.save(submission);
            }
            break;

          case 'reject':
            submission.status = 'rejected';
            if (bulkActionDto.notes) {
              submission.processingNotes = bulkActionDto.notes;
            }
            await this.submissionRepository.save(submission);
            break;

          case 'delete':
            await this.submissionRepository.remove(submission);
            break;
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Failed to process ${submissionId}: ${error.message}` as never,
        );
      }
    }

    return results;
  }

  // Private helper methods
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await this.formRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private validateFormSchema(schema: any): void {
    if (
      !schema.fields ||
      !Array.isArray(schema.fields) ||
      schema.fields.length === 0
    ) {
      throw new BadRequestException('Form must have at least one field');
    }

    if (
      !schema.sections ||
      !Array.isArray(schema.sections) ||
      schema.sections.length === 0
    ) {
      throw new BadRequestException('Form must have at least one section');
    }

    // Validate field IDs are unique
    const fieldIds = new Set();
    for (const field of schema.fields) {
      if (fieldIds.has(field.id)) {
        throw new BadRequestException(`Duplicate field ID: ${field.id}`);
      }
      fieldIds.add(field.id);
    }

    // Validate section field references
    const allFieldIds = new Set(schema.fields.map((f) => f.id));
    for (const section of schema.sections) {
      for (const fieldId of section.fields) {
        if (!allFieldIds.has(fieldId)) {
          throw new BadRequestException(
            `Section references unknown field: ${fieldId}`,
          );
        }
      }
    }
  }

  private validateSubmissionData(
    form: IntakeForm,
    formData: Record<string, any>,
  ): string[] {
    const errors: string[] = [];

    for (const field of form.formSchema.fields) {
      if (!form.shouldShowField(field.id, formData)) {
        continue; // Skip conditional fields that shouldn't be shown
      }

      const validation = form.validateFieldValue(field.id, formData[field.id]);
      if (!validation.isValid) {
        errors.push(validation.error);
      }
    }

    return errors;
  }

  private extractSubmitterInfo(
    submissionDto: IntakeSubmissionDto,
    userId?: string,
  ) {
    return {
      submitterName:
        submissionDto.submitterName ||
        submissionDto.formData.name ||
        submissionDto.formData.fullName,
      submitterEmail:
        submissionDto.submitterEmail || submissionDto.formData.email,
      submitterPhone:
        submissionDto.submitterPhone || submissionDto.formData.phone,
    };
  }

  private async processAutoAssignments(
    form: IntakeForm,
    submission: IntakeSubmission,
  ): Promise<void> {
    if (!form.settings.autoAssign?.enabled) {
      return;
    }

    let assignTo = form.settings.autoAssign.assignTo;

    // Check assignment rules
    if (form.settings.autoAssign.rules) {
      for (const rule of form.settings.autoAssign.rules) {
        const fieldValue = submission.getFormValue(rule.field);
        if (
          this.evaluateAssignmentRule(fieldValue, rule.operator, rule.value)
        ) {
          assignTo = rule.assignTo;
          break;
        }
      }
    }

    if (assignTo) {
      submission.assignedTo = assignTo;
      submission.addAutomationResult('assignment', {
        assignTo,
        reason: 'Auto-assignment based on form rules',
      });
      await this.submissionRepository.save(submission);
    }
  }

  private evaluateAssignmentRule(
    fieldValue: any,
    operator: string,
    ruleValue: any,
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === ruleValue;
      case 'contains':
        return String(fieldValue)
          .toLowerCase()
          .includes(String(ruleValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(ruleValue);
      case 'less_than':
        return Number(fieldValue) < Number(ruleValue);
      default:
        return false;
    }
  }

  private async triggerIntegrations(
    form: IntakeForm,
    submission: IntakeSubmission,
  ): Promise<void> {
    const integrations = form.settings.integrations;
    if (!integrations) return;

    const payload = {
      submissionId: submission.id,
      formName: form.name,
      title: submission.title,
      submitter: submission.getSubmitterIdentifier(),
      formData: submission.data.formData,
      priority: submission.priority,
      createdAt: submission.createdAt,
    };

    // Slack webhook
    if (integrations.slackWebhook) {
      try {
        await this.integrationService.sendSlackNotification(
          integrations.slackWebhook,
          payload,
        );
        submission.addAutomationResult('integration', {
          type: 'slack',
          endpoint: integrations.slackWebhook,
          status: 'success',
        });
      } catch (error) {
        submission.addAutomationResult('integration', {
          type: 'slack',
          endpoint: integrations.slackWebhook,
          status: 'failed',
          error: error.message,
        });
      }
    }

    // Teams webhook
    if (integrations.teamsWebhook) {
      try {
        await this.integrationService.sendTeamsNotification(
          integrations.teamsWebhook,
          payload,
        );
        submission.addAutomationResult('integration', {
          type: 'teams',
          endpoint: integrations.teamsWebhook,
          status: 'success',
        });
      } catch (error) {
        submission.addAutomationResult('integration', {
          type: 'teams',
          endpoint: integrations.teamsWebhook,
          status: 'failed',
          error: error.message,
        });
      }
    }

    // Custom webhooks
    if (integrations.customWebhooks) {
      for (const webhook of integrations.customWebhooks) {
        try {
          await this.integrationService.sendCustomWebhook(
            webhook.url,
            payload,
            webhook.headers,
          );
          submission.addAutomationResult('integration', {
            type: 'custom_webhook',
            endpoint: webhook.url,
            status: 'success',
          });
        } catch (error) {
          submission.addAutomationResult('integration', {
            type: 'custom_webhook',
            endpoint: webhook.url,
            status: 'failed',
            error: error.message,
          });
        }
      }
    }

    await this.submissionRepository.save(submission);
  }

  private async autoCreateWorkflowInstance(
    form: IntakeForm,
    submission: IntakeSubmission,
  ): Promise<void> {
    if (!form.targetWorkflowId) return;

    try {
      const workflowInstance = await this.workflowService.createInstance(
        form.organizationId,
        {
          templateId: form.targetWorkflowId,
          title: submission.title,
          description:
            submission.description ||
            `Auto-created from intake form: ${form.name}`,
          data: {
            sourceType: 'intake',
            sourceId: submission.id,
            intakeData: submission.data.formData,
          },
          assignedTo: submission.assignedTo,
          priority: submission.priority as any,
        },
        submission.submittedBy || 'system',
      );

      submission.workflowInstanceId = workflowInstance.id;
      submission.status = 'processed';
      await this.submissionRepository.save(submission);
    } catch (error) {
      submission.addAutomationResult('integration', {
        type: 'workflow_creation',
        status: 'failed',
        error: error.message,
      });
      await this.submissionRepository.save(submission);
    }
  }
}
