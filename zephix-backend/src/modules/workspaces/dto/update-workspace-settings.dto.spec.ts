import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateWorkspaceSettingsDto } from './update-workspace-settings.dto';

describe('UpdateWorkspaceSettingsDto', () => {
  it('accepts valid inheritance settings payload', async () => {
    const payload = plainToInstance(UpdateWorkspaceSettingsDto, {
      visibility: 'private',
      defaultMethodology: 'agile',
      defaultTemplateId: '11111111-1111-4111-8111-111111111111',
      inheritOrgDefaultTemplate: true,
      governanceInheritanceMode: 'ORG_DEFAULT',
      allowedTemplateIds: ['22222222-2222-4222-8222-222222222222'],
    });

    const errors = await validate(payload);
    expect(errors).toHaveLength(0);
  });

  it('accepts nulls for optional template restriction fields', async () => {
    const payload = plainToInstance(UpdateWorkspaceSettingsDto, {
      defaultTemplateId: null,
      allowedTemplateIds: null,
    });

    const errors = await validate(payload);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid governance inheritance mode and invalid template ids', async () => {
    const payload = plainToInstance(UpdateWorkspaceSettingsDto, {
      governanceInheritanceMode: 'INVALID_MODE',
      defaultTemplateId: 'not-a-uuid',
      allowedTemplateIds: ['not-a-uuid'],
    });

    const errors = await validate(payload);
    expect(errors.length).toBeGreaterThan(0);
  });
});
