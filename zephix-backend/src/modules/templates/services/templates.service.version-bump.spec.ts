import { TemplatesService } from './templates.service';
import { Template } from '../entities/template.entity';

/**
 * TC-B1 — updateV1 bumps the template version on every mutation.
 * Previously version was hardcoded to 1 at creation and never incremented.
 */
describe('TemplatesService.updateV1 — TC-B1 version bump', () => {
  function build(startVersion: number) {
    const stored: Template = {
      id: 'tpl-1',
      templateScope: 'ORG',
      organizationId: 'org-1',
      version: startVersion,
      name: 'Old',
    } as unknown as Template;

    let saved: Template | undefined;
    const templateRepo = {
      findOne: jest.fn().mockResolvedValue(stored),
      save: jest.fn(async (t: Template) => {
        saved = t;
        return t;
      }),
    };
    const manager = { getRepository: jest.fn(() => templateRepo) };
    const dataSource = {
      transaction: jest.fn(async (fn: any) => fn(manager)),
    };
    const tenantContextService = {
      runWithTenant: jest.fn(async (_t: any, fn: any) => fn()),
    };

    const service = new TemplatesService(
      {} as any,
      {} as any,
      dataSource as any,
      tenantContextService as any,
      {} as any,
      {} as any,
      {} as any,
      { record: jest.fn(), recordOrThrow: jest.fn() } as any, // auditService (EX-1: ctor drift)
    );
    return { service, getSaved: () => saved };
  }

  it('increments version 1 → 2 on update', async () => {
    const { service, getSaved } = build(1);
    await service.updateV1(
      'tpl-1',
      { name: 'New name' },
      { organizationId: 'org-1', userId: 'admin-1', platformRole: 'admin' },
    );
    expect(getSaved()?.version).toBe(2);
  });

  it('increments again 5 → 6 (each edit is a new revision)', async () => {
    const { service, getSaved } = build(5);
    await service.updateV1(
      'tpl-1',
      { description: 'edited' },
      { organizationId: 'org-1', userId: 'admin-1', platformRole: 'admin' },
    );
    expect(getSaved()?.version).toBe(6);
  });
});
