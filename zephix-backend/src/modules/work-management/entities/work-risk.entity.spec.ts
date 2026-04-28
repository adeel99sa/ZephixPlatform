import { getMetadataArgsStorage } from 'typeorm';
import { WorkRisk } from './work-risk.entity';

describe('WorkRisk canonicalization metadata', () => {
  const columns = getMetadataArgsStorage().columns.filter(
    (column) => column.target === WorkRisk,
  );

  function findColumn(propertyName: keyof WorkRisk & string) {
    return columns.find((column) => column.propertyName === propertyName);
  }

  it('maps legacy traceability metadata to snake_case database columns', () => {
    expect(findColumn('source')?.options).toMatchObject({
      type: 'varchar',
      length: 50,
      nullable: true,
    });
    expect(findColumn('riskType')?.options).toMatchObject({
      name: 'risk_type',
      type: 'varchar',
      length: 50,
      nullable: true,
    });
    expect(findColumn('evidence')?.options).toMatchObject({
      type: 'jsonb',
      nullable: true,
    });
    expect(findColumn('detectedAt')?.options).toMatchObject({
      name: 'detected_at',
      type: 'timestamp with time zone',
      nullable: true,
    });
    expect(findColumn('legacyRiskId')?.options).toMatchObject({
      name: 'legacy_risk_id',
      type: 'uuid',
      nullable: true,
    });
  });

  it('preserves existing workspace and organization scoping columns', () => {
    expect(findColumn('organizationId')?.options).toMatchObject({
      name: 'organization_id',
      type: 'uuid',
    });
    expect(findColumn('workspaceId')?.options).toMatchObject({
      name: 'workspace_id',
      type: 'uuid',
    });
    expect(findColumn('projectId')?.options).toMatchObject({
      name: 'project_id',
      type: 'uuid',
    });
  });
});
