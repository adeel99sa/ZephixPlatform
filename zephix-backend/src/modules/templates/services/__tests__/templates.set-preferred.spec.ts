/**
 * TC-B6 — setPreferredV1 guard tests (unit, mocked repo/audit).
 *
 * Contract:
 *   - SYSTEM (Zephix-owned) templates → 403 (never 404).
 *   - Another org's template → 403.
 *   - Missing template → 404.
 *   - ORG template, same org → flips is_preferred + audits.
 *   - No-op when the value is unchanged (no write, no audit).
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../templates.service';
import { AuditAction, AuditEntityType } from '../../../audit/audit.constants';

const ORG = 'org-1';
const OTHER_ORG = 'org-2';

function makeService(overrides: {
  template: any;
}) {
  const update = jest.fn().mockResolvedValue({ affected: 1 });
  const findOne = jest.fn().mockResolvedValue(overrides.template);
  const record = jest.fn().mockResolvedValue(undefined);

  const templateRepo = { findOne, update } as any;
  const auditService = { record } as any;
  const tenantContextService = {
    assertOrganizationId: () => ORG,
  } as any;

  // Only the args used by setPreferredV1 need to be real.
  const svc = new (TemplatesService as any)(
    {} as any, // templateRepository (ProjectTemplate)
    templateRepo, // templateRepo (Template)
    {} as any, // dataSource
    tenantContextService,
    {} as any, // templateKpisService
    {} as any, // governanceTemplateService
    {} as any, // governanceRuleResolver
    auditService,
  ) as TemplatesService;

  return { svc, update, findOne, record };
}

const req = (orgId: string) =>
  ({ user: { id: 'user-1', organizationId: orgId, platformRole: 'ADMIN' } }) as any;

describe('TemplatesService.setPreferredV1', () => {
  it('403s on a SYSTEM template', async () => {
    const { svc, update, record } = makeService({
      template: { id: 't1', isSystem: true, templateScope: 'SYSTEM', organizationId: null, isPreferred: false },
    });
    await expect(svc.setPreferredV1(req(ORG), 't1', true)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("403s on another org's template", async () => {
    const { svc, update } = makeService({
      template: { id: 't1', isSystem: false, templateScope: 'ORG', organizationId: OTHER_ORG, isPreferred: false },
    });
    await expect(svc.setPreferredV1(req(ORG), 't1', true)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('404s when the template does not exist', async () => {
    const { svc } = makeService({ template: null });
    await expect(svc.setPreferredV1(req(ORG), 't1', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('flips an ORG template and audits', async () => {
    const { svc, update, record } = makeService({
      template: { id: 't1', isSystem: false, templateScope: 'ORG', organizationId: ORG, workspaceId: null, isPreferred: false },
    });
    const res = await svc.setPreferredV1(req(ORG), 't1', true);
    expect(res).toEqual({ id: 't1', isPreferred: true });
    expect(update).toHaveBeenCalledWith(
      { id: 't1', organizationId: ORG },
      { isPreferred: true },
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: AuditEntityType.TEMPLATE,
        action: AuditAction.UPDATE,
        entityId: 't1',
        before: { isPreferred: false },
        after: { isPreferred: true },
      }),
    );
  });

  it('is a no-op when the value is unchanged', async () => {
    const { svc, update, record } = makeService({
      template: { id: 't1', isSystem: false, templateScope: 'ORG', organizationId: ORG, workspaceId: null, isPreferred: true },
    });
    const res = await svc.setPreferredV1(req(ORG), 't1', true);
    expect(res).toEqual({ id: 't1', isPreferred: true });
    expect(update).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});
