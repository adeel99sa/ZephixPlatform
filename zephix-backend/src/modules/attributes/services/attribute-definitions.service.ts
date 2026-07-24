import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import {
  AttributeDefinition,
  AttributeScope,
} from '../entities/attribute-definition.entity';
import { TemplateAttributeDefinition } from '../entities/template-attribute-definition.entity';
import { ProjectAttributeDefinition } from '../entities/project-attribute-definition.entity';
import { WorkspaceEnabledAttribute } from '../entities/workspace-enabled-attribute.entity';
import { Template } from '../../templates/entities/template.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { CreateAttributeDefinitionDto } from '../dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from '../dto/update-attribute-definition.dto';
import {
  AttributeAuthorityService,
  AttributePrincipal,
} from './attribute-authority.service';

@Injectable()
export class AttributeDefinitionsService {
  constructor(
    @InjectRepository(AttributeDefinition)
    private readonly definitionsRepo: Repository<AttributeDefinition>,
    @InjectRepository(TemplateAttributeDefinition)
    private readonly templateAttachRepo: Repository<TemplateAttributeDefinition>,
    @InjectRepository(ProjectAttributeDefinition)
    private readonly projectAttachRepo: Repository<ProjectAttributeDefinition>,
    @InjectRepository(WorkspaceEnabledAttribute)
    private readonly enabledRepo: Repository<WorkspaceEnabledAttribute>,
    // SEC-XORG-READ-2 (R6): template_attribute_definitions has no tenant column,
    // so a template's attachments are scoped via the parent template's org; the
    // :wsId path param is validated against the caller's org.
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly authorityService: AttributeAuthorityService,
  ) {}

  /**
   * Returns definitions available to a workspace: SYSTEM (enabled via
   * workspace_enabled_attributes) + ORG-scoped (same org) + WORKSPACE-scoped
   * (same workspace). Filter to is_active=true.
   *
   * @param attachedTo  'template' | 'project' — filter to definitions already
   *                    attached to the given refId. Omit for full list.
   */
  async findAvailable(
    wsId: string,
    orgId: string,
    opts?: { attachedTo?: 'template' | 'project'; refId?: string },
  ): Promise<AttributeDefinition[]> {
    const qb = this.definitionsRepo
      .createQueryBuilder('ad')
      .where('ad.isActive = :isActive', { isActive: true })
      .andWhere(
        new Brackets((inner) => {
          inner
            .where(
              `ad.scope = 'SYSTEM' AND EXISTS (
                SELECT 1 FROM workspace_enabled_attributes wea
                WHERE wea.workspace_id = :wsId
                AND wea.attribute_definition_id = ad.id
              )`,
              { wsId },
            )
            .orWhere(
              `ad.scope = 'ORG' AND ad.organizationId = :orgId`,
              { orgId },
            )
            .orWhere(
              `ad.scope = 'WORKSPACE' AND ad.workspaceId = :wsId`,
              { wsId },
            );
        }),
      )
      .orderBy('ad.scope', 'ASC')
      .addOrderBy('ad.label', 'ASC');

    if (opts?.attachedTo === 'template' && opts.refId) {
      qb.innerJoin(
        'template_attribute_definitions',
        'tad',
        'tad.attribute_definition_id = ad.id AND tad.template_id = :refId',
        { refId: opts.refId },
      );
    } else if (opts?.attachedTo === 'project' && opts.refId) {
      qb.innerJoin(
        'project_attribute_definitions',
        'pad',
        'pad.attribute_definition_id = ad.id AND pad.project_id = :refId',
        { refId: opts.refId },
      );
    }

    return qb.getMany();
  }

  async findOrgScoped(orgId: string): Promise<AttributeDefinition[]> {
    return this.definitionsRepo.find({
      where: { scope: AttributeScope.ORG, organizationId: orgId, isActive: true },
      order: { label: 'ASC' },
    });
  }

  async findWorkspaceScoped(wsId: string, orgId: string): Promise<AttributeDefinition[]> {
    return this.definitionsRepo.find({
      where: { scope: AttributeScope.WORKSPACE, workspaceId: wsId, organizationId: orgId, isActive: true },
      order: { label: 'ASC' },
    });
  }

  async findOne(defId: string, orgId: string): Promise<AttributeDefinition> {
    const def = await this.definitionsRepo.findOne({
      where: [
        { id: defId, scope: AttributeScope.SYSTEM },
        { id: defId, organizationId: orgId },
      ],
    });
    if (!def) throw new NotFoundException({ code: 'NOT_FOUND' });
    return def;
  }

  async createWorkspaceScoped(
    dto: CreateAttributeDefinitionDto,
    wsId: string,
    orgId: string,
    userId: string,
  ): Promise<AttributeDefinition> {
    await this.assertNoDuplicateKey(dto.key, orgId, wsId, AttributeScope.WORKSPACE);
    const def = this.definitionsRepo.create({
      ...dto,
      scope: AttributeScope.WORKSPACE,
      workspaceId: wsId,
      organizationId: orgId,
      createdBy: userId,
    });
    return this.definitionsRepo.save(def);
  }

  async createOrgScoped(
    dto: CreateAttributeDefinitionDto,
    orgId: string,
    userId: string,
  ): Promise<AttributeDefinition> {
    await this.assertNoDuplicateKey(dto.key, orgId, null, AttributeScope.ORG);
    const def = this.definitionsRepo.create({
      ...dto,
      scope: AttributeScope.ORG,
      organizationId: orgId,
      workspaceId: null,
      createdBy: userId,
    });
    return this.definitionsRepo.save(def);
  }

  async update(
    defId: string,
    dto: UpdateAttributeDefinitionDto,
    principal: AttributePrincipal,
  ): Promise<AttributeDefinition> {
    const def = await this.findOne(defId, principal.orgId);
    await this.authorityService.assertCanMutate(def, principal);
    Object.assign(def, dto);
    return this.definitionsRepo.save(def);
  }

  async remove(defId: string, principal: AttributePrincipal): Promise<void> {
    const def = await this.findOne(defId, principal.orgId);
    await this.authorityService.assertCanMutate(def, principal);
    await this.definitionsRepo.remove(def);
  }

  // ── Template attachment ───────────────────────────────────────────────────

  async attachToTemplate(
    templateId: string,
    defId: string,
    opts: { locked?: boolean; displayOrder?: number },
    principal: AttributePrincipal,
  ): Promise<TemplateAttributeDefinition> {
    const def = await this.findOne(defId, principal.orgId);
    await this.authorityService.assertCanMutate(def, principal);

    const existing = await this.templateAttachRepo.findOne({
      where: { templateId, attributeDefinitionId: defId },
    });
    if (existing) throw new ConflictException({ code: 'ALREADY_ATTACHED' });

    const attachment = this.templateAttachRepo.create({
      templateId,
      attributeDefinitionId: defId,
      locked: opts.locked ?? false,
      displayOrder: opts.displayOrder ?? 0,
    });
    return this.templateAttachRepo.save(attachment);
  }

  async updateTemplateAttachment(
    templateId: string,
    defId: string,
    opts: { locked?: boolean; displayOrder?: number },
    principal: AttributePrincipal,
  ): Promise<TemplateAttributeDefinition> {
    const attachment = await this.templateAttachRepo.findOne({
      where: { templateId, attributeDefinitionId: defId },
    });
    if (!attachment) throw new NotFoundException({ code: 'NOT_FOUND' });

    const def = await this.findOne(defId, principal.orgId);
    await this.authorityService.assertCanDetach(attachment, def, principal);

    if (opts.locked !== undefined) attachment.locked = opts.locked;
    if (opts.displayOrder !== undefined) attachment.displayOrder = opts.displayOrder;
    return this.templateAttachRepo.save(attachment);
  }

  async detachFromTemplate(
    templateId: string,
    defId: string,
    principal: AttributePrincipal,
  ): Promise<void> {
    const attachment = await this.templateAttachRepo.findOne({
      where: { templateId, attributeDefinitionId: defId },
    });
    if (!attachment) throw new NotFoundException({ code: 'NOT_FOUND' });

    const def = await this.findOne(defId, principal.orgId);
    await this.authorityService.assertCanDetach(attachment, def, principal);
    await this.templateAttachRepo.remove(attachment);
  }

  /**
   * template_attribute_definitions has no tenant column, so attachments are
   * scoped via the parent template's org — a caller may only read attachments on
   * a template their org owns (or a global SYSTEM template). Mirrors the #501
   * template-kpis predicate. Cross-org / unknown template → 404, indistinguishable
   * from not-found.
   */
  private async assertTemplateInOrg(
    templateId: string,
    organizationId: string,
  ): Promise<void> {
    const tpl = await this.templateRepo.findOne({
      where: [
        { id: templateId, organizationId },
        { id: templateId, isSystem: true, organizationId: IsNull() },
      ],
      select: ['id'],
    });
    if (!tpl) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }
  }

  async findTemplateAttachments(
    templateId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<TemplateAttributeDefinition[]> {
    // SEC-XORG-READ-2 (R6): honour the :wsId path param — it must be a workspace
    // in the caller's org, not merely accepted and ignored. (TenantContextInterceptor
    // does NOT validate :wsId — it only reads req.params.workspaceId.)
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId, organizationId },
      select: ['id'],
    });
    if (!ws) {
      throw new NotFoundException(`Workspace not found: ${workspaceId}`);
    }

    // Org-scope the template read (or a global SYSTEM template).
    await this.assertTemplateInOrg(templateId, organizationId);

    return this.templateAttachRepo.find({
      where: { templateId },
      order: { displayOrder: 'ASC' },
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assertNoDuplicateKey(
    key: string,
    orgId: string | null,
    wsId: string | null,
    scope: AttributeScope,
  ): Promise<void> {
    const existing = await this.definitionsRepo.findOne({
      where: {
        key,
        scope,
        ...(orgId ? { organizationId: orgId } : {}),
        ...(wsId ? { workspaceId: wsId } : {}),
      },
    });
    if (existing) {
      throw new ConflictException({ code: 'DUPLICATE_ATTRIBUTE_KEY', key });
    }
  }
}
