import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
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
    // SEC-XORG-4: honour the :wsId path param — the interceptor does NOT validate
    // it (it reads req.params.workspaceId; this route declares :wsId). Without this,
    // a caller passing a foreign :wsId reaches the SYSTEM-enabled and WORKSPACE
    // branches below against another org's workspace.
    await this.assertWorkspaceInOrg(wsId, orgId);

    // SEC-XORG-4: read via the find-family, not a raw createQueryBuilder, so the
    // query is genuinely tenant-scoped and passes the dev/test tenant guardrail.
    // A tenant-aware qb() cannot be used here: SYSTEM definitions have
    // organizationId = NULL and qb() hard-ANDs the caller's org, which would drop
    // them. Each branch below is explicitly org/workspace-scoped instead.
    //   SYSTEM  — enabled in this (org-verified) workspace
    //   ORG     — same org
    //   WORKSPACE — same org AND same workspace (org predicate = defense-in-depth)
    const enabled = await this.enabledRepo.find({
      where: { workspaceId: wsId },
      select: ['attributeDefinitionId'],
    });
    const enabledSystemIds = enabled.map((e) => e.attributeDefinitionId);

    const where: FindOptionsWhere<AttributeDefinition>[] = [
      { scope: AttributeScope.ORG, organizationId: orgId, isActive: true },
      {
        scope: AttributeScope.WORKSPACE,
        workspaceId: wsId,
        organizationId: orgId,
        isActive: true,
      },
    ];
    if (enabledSystemIds.length > 0) {
      where.push({
        scope: AttributeScope.SYSTEM,
        id: In(enabledSystemIds),
        isActive: true,
      });
    }

    let defs = await this.definitionsRepo.find({
      where,
      order: { scope: 'ASC', label: 'ASC' },
    });

    // Optional: restrict to definitions already attached to a template/project.
    if (opts?.attachedTo === 'template' && opts.refId) {
      const attached = await this.templateAttachRepo.find({
        where: { templateId: opts.refId },
        select: ['attributeDefinitionId'],
      });
      const ids = new Set(attached.map((a) => a.attributeDefinitionId));
      defs = defs.filter((d) => ids.has(d.id));
    } else if (opts?.attachedTo === 'project' && opts.refId) {
      const attached = await this.projectAttachRepo.find({
        where: { projectId: opts.refId },
        select: ['attributeDefinitionId'],
      });
      const ids = new Set(attached.map((a) => a.attributeDefinitionId));
      defs = defs.filter((d) => ids.has(d.id));
    }

    return defs;
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
    // SEC-XORG-4: template_attribute_definitions has no tenant column; :templateId
    // is never org-validated by the interceptor or findOne(defId). Gate on the
    // parent template's org FIRST so a cross-org / unknown template → 404 before
    // any def lookup or mutation, indistinguishable from not-found.
    await this.assertTemplateInOrg(templateId, principal.orgId);

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
    // SEC-XORG-4: gate on the parent template's org before touching the attachment.
    await this.assertTemplateInOrg(templateId, principal.orgId);

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
    // SEC-XORG-4: gate on the parent template's org before touching the attachment.
    await this.assertTemplateInOrg(templateId, principal.orgId);

    const attachment = await this.templateAttachRepo.findOne({
      where: { templateId, attributeDefinitionId: defId },
    });
    if (!attachment) throw new NotFoundException({ code: 'NOT_FOUND' });

    const def = await this.findOne(defId, principal.orgId);
    await this.authorityService.assertCanDetach(attachment, def, principal);
    await this.templateAttachRepo.remove(attachment);
  }

  /**
   * The `:wsId` path param is NOT validated by TenantContextInterceptor (it reads
   * req.params.workspaceId; these routes declare :wsId). Every handler that trusts
   * :wsId must therefore assert it belongs to the caller's org here. Cross-org /
   * unknown workspace → 404, indistinguishable from not-found. Introduced by #506
   * (R6); reused by SEC-XORG-4 for findAvailable.
   */
  private async assertWorkspaceInOrg(
    workspaceId: string,
    organizationId: string,
  ): Promise<void> {
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId, organizationId },
      select: ['id'],
    });
    if (!ws) {
      throw new NotFoundException(`Workspace not found: ${workspaceId}`);
    }
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
    // in the caller's org, not merely accepted and ignored.
    await this.assertWorkspaceInOrg(workspaceId, organizationId);

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
